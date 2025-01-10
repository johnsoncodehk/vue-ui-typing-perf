import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# List of TSV files and their corresponding titles and filenames
files = [
    ('temp/setup_function_completion.tsv', 'Setup Function Completion', 'temp/setup_function_completion.png'),
    ('temp/global_completion.tsv', 'Global Completion', 'temp/global_completion.png'),
    ('temp/path_completion.tsv', 'Path Completion', 'temp/path_completion.png')
]

def get_dynamic_ticks(min_val, max_val):
    """Generate dynamic tick values based on data range"""
    # Determine the order of magnitude
    magnitude = np.floor(np.log10(max_val))
    
    # Generate appropriate tick intervals based on data range
    if max_val - min_val > 1000:
        base_ticks = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
    else:
        base_ticks = [1, 5, 10, 20, 50, 100, 200, 500]
    
    # Filter tick values within the data range
    ticks = np.array([t for t in base_ticks if t >= min_val and t <= max_val * 1.1])
    
    # Ensure at least 5 tick points for better readability
    if len(ticks) < 5:
        ticks = np.linspace(min_val, max_val, 5)
        
    return ticks

def custom_scale(data):
    """Transform data using log scale for better visualization of low values"""
    return np.log1p(data) * 100

# Iterate over the files and create separate plots
for file, title, filename in files:
    df = pd.read_csv(file, sep='\t')  # Read the TSV file
    frameworks = df.columns[1:]  # All columns except the first one (i.e., frameworks)

    # Create a new figure for each plot
    plt.figure(figsize=(14, 8))
    
    # Get data range for dynamic scaling
    min_val = df[frameworks].min().min()
    max_val = df[frameworks].max().max()
    
    # Generate appropriate tick values
    y_ticks = get_dynamic_ticks(min_val, max_val)
    
    # Plot each framework with transformed scale
    for framework in frameworks:
        y_transformed = custom_scale(df[framework])
        plt.plot(df.index + 1, y_transformed, marker='o', alpha=0.8, label=framework)

    # Set custom y-axis ticks and labels
    y_transformed_ticks = custom_scale(y_ticks)
    plt.yticks(y_transformed_ticks, [f'{int(y)}' for y in y_ticks])
    
    plt.title(title)
    plt.xlabel('Order')
    plt.ylabel('Value (ms)')
    plt.xticks(df.index + 1)  # Start X axis values from 1
    plt.grid(True, alpha=0.3)
    plt.legend()

    # Save the individual plot as an image file
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    plt.close()  # Close the figure to free up memory

# Create a single figure for vertical combination of all plots
fig, axes = plt.subplots(nrows=3, ncols=1, figsize=(14, 24))  # 3 rows, 1 column

for ax, (file, title, filename) in zip(axes, files):
    df = pd.read_csv(file, sep='\t')  # Read the TSV file
    frameworks = df.columns[1:]  # All columns except the first one (i.e., frameworks)

    # Get data range for dynamic scaling
    min_val = df[frameworks].min().min()
    max_val = df[frameworks].max().max()
    
    # Generate appropriate tick values
    y_ticks = get_dynamic_ticks(min_val, max_val)

    # Plot each framework with transformed scale
    for framework in frameworks:
        y_transformed = custom_scale(df[framework])
        ax.plot(df.index + 1, y_transformed, marker='o', alpha=0.8, label=framework)

    # Set custom y-axis ticks and labels
    y_transformed_ticks = custom_scale(y_ticks)
    ax.set_yticks(y_transformed_ticks)
    ax.set_yticklabels([f'{int(y)}' for y in y_ticks])
    
    ax.set_title(title)
    ax.set_xlabel('Order')
    ax.set_ylabel('Value (ms)')
    ax.set_xticks(df.index + 1)  # Start X axis values from 1
    ax.grid(True, alpha=0.3)
    ax.legend()

# Adjust layout for better spacing between plots
plt.tight_layout()

# Save the combined plots as a single image
plt.savefig('temp/combined_plots.png', dpi=300, bbox_inches='tight')
plt.close()  # Close the figure to free up memory

print("All individual plots and the combined plot saved successfully.")