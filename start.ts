import { setup } from './utils';
import * as path from 'path';
import { execaCommand } from 'execa';
import * as fs from 'fs';
import * as assert from 'assert';

const sample = 1; // less for faster, bigger for smooth numbers

(async () => {

    const context = await setup(path.join(__dirname, 'servers'), {
        'v1.8.8': { npm: '@vue/language-server@1.8.8', bin: './bin/vue-language-server.js' },
    });
    const libraries: {
        name: string;
        deps: string[];
        version: string;
    }[] = [
            { name: 'vanilla', deps: ['vue'], version: 'latest' },
            { name: 'ant-design-vue', deps: ['ant-design-vue'], version: 'latest' },
            { name: 'anu-vue', deps: ['anu-vue'], version: 'latest' },
            { name: 'bootstrap-vue-next', deps: ['bootstrap-vue-next'], version: 'latest' },
            { name: 'element-plus', deps: ['element-plus'], version: 'latest' },
            { name: 'naive-ui', deps: ['naive-ui'], version: 'latest' },
            {
                name: 'oku-ui', deps: [
                    '@oku-ui/arrow',
                    '@oku-ui/aspect-ratio',
                    '@oku-ui/avatar',
                    '@oku-ui/checkbox',
                    '@oku-ui/collapsible',
                    '@oku-ui/label',
                    '@oku-ui/popper',
                    '@oku-ui/presence',
                    '@oku-ui/progress',
                    '@oku-ui/separator',
                    // '@oku-ui/switch',
                    '@oku-ui/toggle',
                    // '@oku-ui/visually-hidden',
                ], version: 'latest'
            },
            { name: 'quasar', deps: ['quasar'], version: 'latest' },
            { name: 'radix-vue', deps: ['radix-vue'], version: 'latest' },
            { name: 'vuetify', deps: ['vuetify'], version: 'latest' },

            // NO TS
            // { name: 'primevue', deps: ['primevue'], version: 'latest' },
            // { name: 'keen-ui', deps: ['keen-ui'], version: 'latest' },
        ];

    const pathCompletionTsvRows: (string | number)[][] = [['']];
    const autoImportTsvRows: (string | number)[][] = [['']];
    const setupContextTsvRows: (string | number)[][] = [['']];

    const tempPath = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath);
    }

    for (const library of libraries) {

        console.log(library.name + '...');

        pathCompletionTsvRows[0].push(library.name);
        autoImportTsvRows[0].push(library.name);
        setupContextTsvRows[0].push(library.name);

        /**
         * Setup
         */
        const folder = path.join(tempPath, library.name);
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
            const dependencies = { vue: 'latest' };
            for (const dep of library.deps) {
                dependencies[dep] = library.version;
            }
            fs.writeFileSync(path.join(folder, 'package.json'), JSON.stringify({ dependencies }));
            fs.writeFileSync(path.join(folder, 'tsconfig.json'), JSON.stringify({}));
            await execaCommand(`pnpm i`, { cwd: folder }).pipeStdout?.(process.stdout);
        }

        /**
         * Path Completion
         */
        fs.writeFileSync(path.join(folder, 'App.vue'), [
            `<script setup lang="ts">`,
            ...library.deps.map(dep => `import {} from '${dep}';`),
            `import {} from './';`,
            `</script>`,
        ].join('\n'));

        const pathCompletionResult = await context.start({
            rootPath: folder,
            repeatTimes: sample,
        }, async (connection, timekeeper, helpers) => {

            connection.onRequest('client/registerCapability', () => { /* ignore */ });
            connection.onRequest('workspace/configuration', () => { /* ignore */ });

            await helpers.initialize({ typescript: { tsdk: path.join(__dirname, 'node_modules', 'typescript', 'lib') } });

            let document = await helpers.openDocument('./App.vue', 'vue');

            await helpers.requestCompletion(document, document.positionAt(document.getText().lastIndexOf(`';`))); // ignore first time

            for (let i = 0; i < 50; i++) {
                await timekeeper(async () => {
                    document = await helpers.editDocument(
                        document,
                        document.positionAt(0),
                        document.positionAt(document.getText().length),
                        document.getText().includes(`'./';`)
                            ? document.getText().replace(`'./';`, `'';`)
                            : document.getText().replace(`'';`, `'./';`)
                    );
                    await helpers.requestCompletion(document, document.positionAt(document.getText().lastIndexOf(`';`)));
                });
            }
        });

        /**
         * Global Completion
         */
        fs.writeFileSync(path.join(folder, 'App.vue'), [
            `<script lang="ts">`,
            ...library.deps.map(dep => `import {} from '${dep}';`),
            `/* __complete__ */`,
            `</script>`,
        ].join('\n'));

        const autoImportResult = await context.start({
            rootPath: folder,
            repeatTimes: sample,
        }, async (connection, timekeeper, helpers) => {

            connection.onRequest('client/registerCapability', () => { /* ignore */ });
            connection.onRequest('workspace/configuration', () => { /* ignore */ });

            await helpers.initialize({ typescript: { tsdk: path.join(__dirname, 'node_modules', 'typescript', 'lib') } });

            let document = await helpers.openDocument('./App.vue', 'vue');

            const getActionPos = () => document.positionAt(document.getText().lastIndexOf(`/* __complete__ */`));

            await helpers.requestCompletion(document, getActionPos()); // ignore first time

            for (let i = 0; i < 10; i++) {

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 'w');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'watch'), true);
                });

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 'a');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'watch'), true);
                });

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 't');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'watch'), true);
                });

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 'c');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'watch'), true);
                });

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 'h');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'watch'), true);
                });

                // delete added text
                document = await helpers.editDocument(document, { line: getActionPos().line, character: getActionPos().character - 5 }, getActionPos(), '');
            }
        });

        /**
         * setup() Completion
         */
        fs.writeFileSync(path.join(folder, 'App.vue'), [
            `<script lang="ts">`,
            ...library.deps.map(dep => `import {} from '${dep}';`),
            `export default { setup(props) {`,
            `/* __complete__ */`,
            `} }`,
            `</script>`,
        ].join('\n'));

        const setupContextResult = await context.start({
            rootPath: folder,
            repeatTimes: sample,
        }, async (connection, timekeeper, helpers) => {

            connection.onRequest('client/registerCapability', () => { /* ignore */ });
            connection.onRequest('workspace/configuration', () => { /* ignore */ });

            await helpers.initialize({ typescript: { tsdk: path.join(__dirname, 'node_modules', 'typescript', 'lib') } });

            let document = await helpers.openDocument('./App.vue', 'vue');

            const getActionPos = () => document.positionAt(document.getText().lastIndexOf(`/* __complete__ */`));

            await helpers.requestCompletion(document, getActionPos()); // ignore first time

            for (let i = 0; i < 10; i++) {

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 'p');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'props'), true);
                });

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 'r');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'props'), true);
                });

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 'o');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'props'), true);
                });

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 'p');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'props'), true);
                });

                await timekeeper(async () => {
                    document = await helpers.editDocument(document, getActionPos(), getActionPos(), 's');
                    assert.equal((await helpers.requestCompletion(document, getActionPos()) as any).items.some(item => item.label === 'props'), true);
                });

                // delete added text
                document = await helpers.editDocument(document, { line: getActionPos().line, character: getActionPos().character - 5 }, getActionPos(), '');
            }
        });

        const times_1 = Object.values(pathCompletionResult)[0];
        for (let j = 0; j < times_1.length; j++) {
            if (pathCompletionTsvRows.length <= j + 1) {
                pathCompletionTsvRows.push([j + 1]);
            }
            pathCompletionTsvRows[j + 1].push(times_1[j])
        }

        const times_2 = Object.values(autoImportResult)[0];
        for (let j = 0; j < times_2.length; j++) {
            if (autoImportTsvRows.length <= j + 1) {
                autoImportTsvRows.push([j + 1]);
            }
            autoImportTsvRows[j + 1].push(times_2[j])
        }

        const times_3 = Object.values(setupContextResult)[0];
        for (let j = 0; j < times_3.length; j++) {
            if (setupContextTsvRows.length <= j + 1) {
                setupContextTsvRows.push([j + 1]);
            }
            setupContextTsvRows[j + 1].push(times_3[j])
        }
    }

    saveTsv(path.join(tempPath, 'path_completion.tsv'), pathCompletionTsvRows.map(arr => arr.join('\t')).join('\n'));
    saveTsv(path.join(tempPath, 'global_completion.tsv'), autoImportTsvRows.map(arr => arr.join('\t')).join('\n'));
    saveTsv(path.join(tempPath, 'setup_function_completion.tsv'), setupContextTsvRows.map(arr => arr.join('\t')).join('\n'));
})();

function saveTsv(path: string, data: string) {
    console.log(data);
    console.log(path);
    fs.writeFileSync(path, data);
}
