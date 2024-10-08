import pandas as pd
from collections import defaultdict
import uuid
import numpy as np

from utils import data_config, config, load_existing, save_entity_file, save_entity_data, get_entity_info, save_groups, clear_data
from gen import generate_data, generate_compound_keys


def calculate_similarity_exact(compound_info, historical_data, template):
    fields = template.split('_') # extract fields and data from keys
    values = compound_info.split('_')
    
    total_score = 0.0 # sum total and weights
    total_weight = 0.0

    comparisons = 0 # to count for stats
    fields_h = historical_data[0]
    best_h = historical_data[1] # Use first column of historical for most significant values

    for field, value in zip(fields, values): # iterate through existing fields in compound_info

        if field in config['weights'] and field in fields_h: # if the field is also in the historical data
            comparisons += 1 # Counting comparisons
            weight = config['weights'][field]

            total_weight += weight # always add to total wieght if fields are matched

            if value == best_h[fields_h.index(field)]: # if the values match add to score
                total_score += weight
            

    normalized_score = total_score / total_weight if total_weight > 0 else 0.0 # Normalize the score, this might be a bad idea.
    return normalized_score, comparisons
    
def group_similarity(entity_data):
    historical_data = load_existing(data=True) # load historical
    
    entity_type, entity_id, transaction, entity_key = entity_data[:4] # split data
    template, compound_info = entity_key.split(':')# split key from to template and info
    
    best_score = 0 # Track best score
    best_group = None # Track bes group
    total_comparisons = 0 # count comparisons

    for group_id, group_historical in historical_data.items(): # Search throug historical data
        score, comparisons = calculate_similarity_exact(compound_info, group_historical, template)
        total_comparisons += comparisons
        if score > best_score and score >= config['threshold']: # a match is found

            best_score = score # update best score
            best_group = group_id # update best group

    return best_score, best_group, total_comparisons # return bestscore,group and comparisons count
    
def match_entities(all_data, existing_groups):
    grouped_entities = existing_groups.copy()
    total_comparisons = 0 # Counting comparisons for stats, this may not be used

    # add founder and business
    for entity_data in all_data:
        entity_type, entity_id, transaction, entity_key = entity_data[:4] # split row of data, used to check type
        if entity_type != 'Customer': #avoid all non customer types
            continue
        t_parts= transaction.split('_')
        if t_parts[2] =='ownBusiness':
            new_group_id = str(uuid.uuid4()) # random ID
            grouped_entities[new_group_id] = [entity_data] # add the group data
            save_entity_file(new_group_id, [entity_data]) # save new entity file
            save_entity_data(new_group_id, entity_data)# save new historical data
            all_data.remove(entity_data) # remove to avoid double processing

    # First, rest of 'Customer' types
    for entity_data in all_data:
        entity_type, entity_id, transaction, entity_key = entity_data[:4] # split row of data, used to check type
        if entity_type != 'Customer': #avoid all non customer types
            continue
        
        t_parts = transaction.split("_")
        if t_parts[2] == 'billPay':
            for group_id,group_data in grouped_entities.items():
                for member in group_data:
                    t2_parts = member[2].split('_')
                    if t2_parts[2] == 'ownBusiness' and t2_parts[3] == t_parts[3]:
                        entity_data.append(group_id)

        skip = False
        #print(grouped_entities)
        for group_id, group_data in list(grouped_entities.items()): 
            if any(member[0] == 'Customer' and member[1] == entity_id for member in group_data): # Make sure there is a customer with a matching ID
                grouped_entities[group_id].append(entity_data)
                save_entity_file(group_id, grouped_entities[group_id]) # save updated group file
                save_entity_data(group_id, entity_data) # save updated historical data
                all_data.remove(entity_data) # remove so we dont process again
                skip = True
        if skip:
            continue    
        
        best_score, best_group, comparisons = group_similarity(entity_data) # find the best group if any
        total_comparisons += comparisons

        if best_group:
            grouped_entities[best_group].append(entity_data)
            save_entity_file(best_group,grouped_entities[best_group]) # save updated group file
            save_entity_data(best_group, entity_data) # save updated historical data
            all_data.remove(entity_data) # remove so we dont process again
        else: # No matches found and we need to make a new entity for this one
            new_group_id = str(uuid.uuid4()) # random ID
            grouped_entities[new_group_id] = [entity_data] # add the group data
            save_entity_file(new_group_id, [entity_data]) # save new entity file
            save_entity_data(new_group_id, entity_data)# save new historical data
            all_data.remove(entity_data) # remove to avoid double processing

    # Now, process all 'Counter-Party' types
    for entity_data in all_data:
        entity_type, entity_id, transaction, entity_key = entity_data[:4] # split row of data, used to check type
        if entity_type != 'Counter-Party': #avoid all non customer types
            continue
        t_parts = transaction.split("_")
        if t_parts[2] == 'billPayed':
            link_id = find_party(entity_id,grouped_entities) #Find link
            entity_data.append(link_id)
            business_id = t_parts[3]
            amount = t_parts[4]
            for group_id,group in grouped_entities.items():
                for member in group:
                    t2_parts = set(member[2].split('_'))
                    if 'ownBusiness' in t2_parts and business_id in t2_parts:
                        grouped_entities[group_id].append(entity_data) # add the counterparty
                        save_entity_file(group_id, grouped_entities[group_id]) # Save group file
                        all_data.remove(entity_data)

    #print(all_data)
    for entity_data in all_data:
        entity_type, entity_id, transaction, entity_key = entity_data[:4] # split row of data, used to check type
        if entity_type!='Business':
            continue
        print("TEST")
        t_parts = transaction.split('_')
        owner = t_parts[3]
        group_id = find_party(owner,grouped_entities)
        grouped_entities[group_id].append(entity_data)
        save_entity_file(group_id, grouped_entities[group_id]) # Save group file
        all_data.remove(entity_data)

    # There shouldnt be any customers left
    for entity_data in all_data:
        process_counter_party(grouped_entities,entity_data)
        all_data.remove(entity_data)

    print(all_data)

    return grouped_entities, total_comparisons

def process_counter_party(grouped_entities,entity_data):
    grouped_entities = load_existing() # load existing groups
    entity_type, entity_id, transaction, entity_key = entity_data[:4] # extract data types from row
    if entity_type != 'Counter-Party': # no customers should remain but for safety
        return
    transaction_parts = transaction.split('_') # Split transaction to find counterparty of the counterparty

    customer_id = transaction_parts[3] # This is the other party associated with the transaction
    #print(customer_id)
    link_id = find_party(entity_id,grouped_entities) #Find link
    entity_data.append(link_id)
    group_id = find_party(customer_id,grouped_entities) # Find the group and add it
    grouped_entities[group_id].append(entity_data) # add the counterparty
    save_entity_file(group_id, grouped_entities[group_id]) # Save group file

        

def find_party(og_party_id,grouped_entities):

    for group_id, group_data in grouped_entities.items(): 
            if any(member[0] == 'Customer' and member[1] == og_party_id for member in group_data): # Make sure there is a customer with a matching ID
                return group_id
    return False


def run_matching(input_data):
    existing_groups = load_existing() # load groups to start
    grouped_entities, total_comparisons = match_entities(input_data, existing_groups) # takes care of all matching 
    #save_groups(grouped_entities) # save groups
    return grouped_entities, total_comparisons # just for debug and stats

def start_matching(input_data):
    # Erase groups 
    clear_data()
    existing_groups = defaultdict(list) # start groups data
    grouped_entities, total_comparisons = match_entities(input_data, existing_groups) # takes care of all matching 
    #save_groups(grouped_entities) # save groups
    return grouped_entities, total_comparisons # just for debug and stats

if __name__ == "__main__":
    # result = system.run_pipeline(num_records=1)
    
    # Generate data
    raw_data = generate_data(4)

    # Generate compound keys
    compound_key_data = generate_compound_keys(raw_data)
    df = pd.DataFrame(compound_key_data, columns=['Type','ID','Transaction','Template:Compound_info'])
    df.to_csv('data/transactions/data.csv',index=None)
    
    # Run matching
    grouped_entities, total_comparisons = start_matching(compound_key_data)
    print(f"Number of groups formed: {len(grouped_entities)}")
