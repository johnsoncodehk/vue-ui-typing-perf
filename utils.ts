import * as fs from 'fs';
import * as path from 'path';
import { execaCommand } from 'execa';
import * as cp from 'child_process';
import * as protocol from 'vscode-languageserver-protocol/node';
import { URI } from 'vscode-uri';

export async function setup(serversDir: string, pkgs: Record<string,
    { module: string }
    | { npm: string, bin: string }
>) {

    const packageJson = { dependencies: {} };

    for (const [serverName, mod] of Object.entries(pkgs)) {
        if ('npm' in mod) {
            packageJson.dependencies[serverName] = 'npm:' + mod.npm;
        }
    }

    if (!fs.existsSync(serversDir)) {
        fs.mkdirSync(serversDir);
    }
    fs.writeFileSync(path.join(serversDir, 'package.json'), JSON.stringify(packageJson, undefined, 2));

    await execaCommand(`pnpm i`, { cwd: serversDir }).pipeStdout?.(process.stdout);

    return { start };

    async function start(
        options: {
            rootPath: string;
            repeatTimes: number;
            tsvPath?: string;
        },
        fn: (
            connection: protocol.ProtocolConnection,
            timekeeper: (fn: () => void, eventName?: string) => Promise<void>,
            helpers: ReturnType<typeof createHelpers>
        ) => void
    ) {

        const result: Record<string, number[]> = {};
        const eventNames: string[] = [];

        for (let i = 0; i < options.repeatTimes; i++) {
            for (const serverName in pkgs) {
                const mod = pkgs[serverName];
                const serverModule = 'npm' in mod
                    ? path.resolve(path.join(serversDir, 'node_modules', serverName), mod.bin)
                    : path.resolve(serversDir, mod.module);
                // console.log(`${serverName}...`, serverModule);
                const childProcess = cp.fork(
                    serverModule,
                    [
                        '--node-ipc',
                        `--clientProcessId=${process.pid.toString()}`,
                    ],
                    {
                        execArgv: ['--nolazy'],
                        env: process.env,
                        cwd: options.rootPath,
                        silent: true,
                    });
                if (!childProcess.stdout || !childProcess.stdin || !childProcess.stderr) {
                    throw new Error('Process created without stdio streams');
                }
                const times: number[] = [];
                const connection = protocol.createProtocolConnection(
                    new protocol.IPCMessageReader(childProcess),
                    new protocol.IPCMessageWriter(childProcess)
                );
                connection.listen();
                eventNames.length = 0;

                await fn(
                    connection,
                    async (fn, eventName) => {
                        const start = Date.now();
                        try {
                            await fn();
                        }
                        catch (e) {
                            console.error(e);
                            throw e;
                        }
                        const duration = Date.now() - start;
                        times.push(duration);
                        eventNames.push(eventName || (eventNames.length + 1).toString());
                    },
                    createHelpers(options.rootPath, connection)
                );

                childProcess.kill();
                if (result[serverName]) {
                    result[serverName] = result[serverName].map((time, i) => time + times[i]);
                }
                else {
                    result[serverName] = times;
                }
            }
        }

        if (options.repeatTimes > 1) {
            for (const times of Object.values(result)) {
                for (let i = 0; i < times.length; i++) {
                    times[i] /= options.repeatTimes;
                }
            }
        }

        const serverNames = Object.keys(pkgs);
        let tsv = ['', ...serverNames].join('\t') + '\n';
        for (let i = 0; i < eventNames.length; i++) {
            tsv += [eventNames[i], ...serverNames.map(serverName => result[serverName][i])].join('\t') + '\n';
        }
        if (options.tsvPath) {
            fs.writeFileSync(options.tsvPath, tsv);
            console.log('Saved result to', options.tsvPath);
        }
        return result;
    }

    function createHelpers(dir: string, connection: protocol.ProtocolConnection) {
        return {
            async initialize(initializationOptions: any) {
                initializationOptions.vue = { hybridMode: false };
                const result = await connection.sendRequest('initialize', {
                    rootPath: dir,
                    capabilities: {},
                    initializationOptions: initializationOptions,
                });
                await connection.sendNotification('initialized');
                return result;
            },
            async openDocument(filePath: string, languageId: string) {
                const fileName = path.resolve(dir, filePath);
                const uri = URI.file(fileName).toString();
                const item = protocol.TextDocumentItem.create(uri, languageId, 0, fs.readFileSync(fileName, 'utf-8'));
                await connection.sendNotification(protocol.DidOpenTextDocumentNotification.type, {
                    textDocument: item,
                });
                return protocol.TextDocument.create(uri, languageId, 0, item.text);
            },
            async editDocument(document: protocol.TextDocument, start: protocol.Position, end: protocol.Position, text: string) {
                const newText = protocol.TextDocument.applyEdits(document, [protocol.TextEdit.replace({ start, end }, text)]);
                const newDocument = protocol.TextDocument.create(document.uri, document.languageId, document.version + 1, newText);
                await connection.sendNotification(protocol.DidChangeTextDocumentNotification.type, {
                    textDocument: {
                        uri: newDocument.uri,
                        version: newDocument.version,
                    },
                    contentChanges: [{ range: { start, end }, text }],
                });
                return newDocument;
            },
            async requestCompletion(document: protocol.TextDocument, start: protocol.Position) {
                return await connection.sendRequest(protocol.CompletionRequest.type, {
                    textDocument: {
                        uri: document.uri,
                    },
                    position: start,
                });
            },
        }
    }
}
