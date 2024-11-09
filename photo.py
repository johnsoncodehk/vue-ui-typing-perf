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
        plt.plot(df.index + 1, df[framework], marker='o', alpha=0.8, label=framework)  # 40% transparent

    # Chart details for each plot
    plt.title(title)
    plt.xlabel('Order')
    plt.ylabel('Value')
    plt.xticks(df.index + 1)  # Start X axis values from 1
    plt.grid()
    plt.legend()

    # Save the individual plot as an image file
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    plt.close()  # Close the figure to free up memory

# Create a single figure for vertical combination of all plots
fig, axes = plt.subplots(nrows=3, ncols=1, figsize=(14, 24))  # 3 rows, 1 column

# Iterate over the files and create separate plots
for ax, (file, title, filename) in zip(axes, files):
    df = pd.read_csv(file, sep='\t')  # Read the TSV file
    frameworks = df.columns[1:]  # All columns except the first one (i.e., frameworks)

    # Plot each framework
    for framework in frameworks:
        ax.plot(df.index + 1, df[framework], marker='o', alpha=0.8, label=framework)  # 40% transparent

    # Chart details for each plot
    ax.set_title(title)
    ax.set_xlabel('Order')
    ax.set_ylabel('Value')
    ax.set_xticks(df.index + 1)  # Start X axis values from 1
    ax.grid()
    ax.legend()

# Adjust layout for better spacing between plots
plt.tight_layout()

# Save the combined plots as a single image
combined_filename = 'temp/combined_plots.png'
plt.savefig(combined_filename, dpi=300, bbox_inches='tight')
plt.close()  # Close the figure to free up memory

print("All individual plots and the combined plot saved successfully.")