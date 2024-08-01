# src/utils.py

import yaml
import pandas as pd
import os
import csv
from collections import defaultdict
import numpy as np
from datetime import date


# Load configurations
config_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'config')
configPath = os.path.join(config_dir, 'config.yaml')
dataPath = os.path.join(config_dir, 'data_config.yaml')

with open(dataPath, 'r') as file:
    data_config = yaml.safe_load(file)

with open(configPath, 'r') as file:
    config = yaml.safe_load(file)

def format_transaction(transaction):
    fields = config['potential_columns']
    formatted = {fields[i]: value for i, value in enumerate(transaction) if i < len(fields) and value}
    
    # Find the best matching template
    templates = config['compound_key_templates']
    best_template = None
    max_fields = 0
    
    for template in templates:
        template_fields = template.split('_')
        if all(field in formatted for field in template_fields):
            if len(template_fields) > max_fields:
                max_fields = len(template_fields)
                best_template = template
    if best_template:
        return {field: formatted.get(field) for field in best_template.split('_')}
    return None

def read_csv(path):
    try:
        df = pd.read_csv(path)
        return df
    except Exception as e:
        return pd.DataFrame()

def load_existing(data=False):
    path = data_config['entity_storage_path']
    if data:
        path = data_config['entity_data_storage_path']
    existing_groups = defaultdict(list)
    if not os.path.exists(path):
        return existing_groups
    for filename in os.listdir(path):
        if filename.endswith('.csv'):
            group_id = filename.split('.')[0]
            with open(os.path.join(path, filename), 'r') as f:
                reader = csv.reader(f)
                if not data:
                    next(reader)  # Skip header
                for row in reader:
                    existing_groups[group_id].append(row)
    return existing_groups

def save_entity_file(entity_id, data_rows):

    os.makedirs(data_config['entity_storage_path'], exist_ok=True)
    file_path = os.path.join(data_config['entity_storage_path'], f"{entity_id}.csv")
    
    with open(file_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Type', 'ID', 'Transaction', 'Template:Compound_info','Link'])
        for row in data_rows:
            writer.writerow(row)

def save_entity_data(entity_id, data): # data[3] stores a template:info_compounded_...etc we need to split and see what we are dealing with
    # Extract template and compound info from entity data
    template, compound_info = data[3].split(":")
    fields = template.split('_')
    values = compound_info.split('_')
    
    # Create a dictionary of field-value pairs
    new_data = dict(zip(fields, values))
    
    # Prepare the file path
    os.makedirs(data_config['entity_data_storage_path'], exist_ok=True)
    file_path = os.path.join(data_config['entity_data_storage_path'], f"{entity_id}.csv")
    
    if not os.path.isfile(file_path):
        # If file doesn't exist, create a new DataFrame and save it
        df = pd.DataFrame([new_data])
        df.to_csv(file_path, index=False)
        print(f"New historical data file created for entity {entity_id}.")
    else:
        # If file exists, read it and update as necessary
        df = pd.read_csv(file_path)
        
        # Ensure all fields are present in the DataFrame
        for field in new_data.keys():
            if field not in df.columns:
                df[field] = np.nan
        
        # Ensure the first row is complete
        first_row = df.iloc[0]
        for field, value in new_data.items():
            if pd.isna(first_row[field]):
                df.at[0, field] = value
        
        # Compare new data with existing data and update if necessary
        data_changed = False
        for field, value in new_data.items():
            if str(df.at[0, field]) != str(value):
                data_changed = True
                # if len(df) == 1:
                    # If there's only one row, add a new row
                new_row = pd.DataFrame([new_data])
                df = pd.concat([df, new_row], ignore_index=True)
                # else:
                #     # If there are multiple rows, update the last row
                #     df.at[len(df)-1, field] = value
        
        if data_changed:
            # Save the updated DataFrame
            df.to_csv(file_path, index=False)
            print(f"Historical data for entity {entity_id} has been updated.")
        else:
            print(f"No changes detected for entity {entity_id}. Historical data remains unchanged.")

def get_entity_info(entity_id):
    file_path = os.path.join(data_config['entity_storage_path'], f"{entity_id}.csv")
    data_rows = []
    with open(file_path, 'r') as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        for row in reader:
            data_rows.append(row)
    return data_rows

def save_groups(grouped_entities):
    for group_id, group_data in grouped_entities.items():
        save_entity_file(group_id, group_data)

