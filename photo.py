import pandas as pd
import matplotlib.pyplot as plt

# List of TSV files and their corresponding titles and filenames
files = [
    ('temp/setup_function_completion.tsv', 'Setup Function Completion', 'temp/setup_function_completion.png'),
    ('temp/global_completion.tsv', 'Global Completion', 'temp/global_completion.png'),
    ('temp/path_completion.tsv', 'Path Completion', 'temp/path_completion.png')
]

# Iterate over the files and create separate plots
for file, title, filename in files:
    df = pd.read_csv(file, sep='\t')  # Read the TSV file
    frameworks = df.columns[1:]  # All columns except the first one (i.e., frameworks)

    # Create a new figure for each plot
    plt.figure(figsize=(14, 8))

    # Plot each framework
    for framework in frameworks:
        if framework == 'oku-ui':
            plt.plot(df.index + 1, df[framework], marker='o', linewidth=2.5, color='darkgreen', label=framework)  # Bold line
        elif framework == 'radix-vue':
            plt.plot(df.index + 1, df[framework], marker='o', linewidth=2.5, color='red', label=framework)  # Red line
        else:
            plt.plot(df.index + 1, df[framework], marker='o', alpha=0.3, label=framework)  # 40% transparent

    # Chart details for each plot
    plt.title(title)
    plt.xlabel('Order')
    plt.ylabel('Value')
    plt.xticks(df.index + 1)  # Start X axis values from 1
    plt.grid()
    plt.legend()
    
    # Save the plot as an image file
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    plt.close()  # Close the figure to free up memory

print("All plots saved successfully.")