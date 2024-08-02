import pandas as pd
from collections import defaultdict
import uuid
import numpy as np

from utils import data_config, config, load_existing, save_entity_file, save_entity_data, get_entity_info, save_groups
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

    # First, process all 'Customer' types
    for entity_data in all_data:
        entity_type, entity_id, transaction, entity_key = entity_data[:4] # split row of data, used to check type
        if entity_type != 'Customer': #avoid all non customer types
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
    # There shouldnt be any customers left
    process_counter_party(all_data)

    return grouped_entities, total_comparisons

def process_counter_party(all_data):
    for entity_data in all_data: 
        entity_type, entity_id, transaction, entity_key = entity_data[:4] # extract data types from row
        if entity_type != 'Counter-Party': # no customers should remain but for safety
            continue
        transaction_parts = transaction.split('_') # Split transaction to find counterparty of the counterparty

        customer_id = transaction_parts[3] # This is the other party associated with the transaction
        print(customer_id)
        grouped_entities = load_existing() # load existing groups
        link_id = find_party(entity_id,grouped_entities) #Find link
        entity_data.append(link_id)
        group_id = find_party(customer_id,grouped_entities) # Find the group and add it
        grouped_entities[group_id].append(entity_data) # add the counterparty
        save_entity_file(group_id, grouped_entities[group_id]) # Save group file
        

def find_party(og_party_id,grouped_entities):

    for group_id, group_data in grouped_entities.items(): 
            if any(member[0] == 'Customer' and member[1] == og_party_id for member in group_data): # Make sure there is a customer with a matching ID
                return group_id


def run_matching(input_data):
    existing_groups = load_existing() # load groups to start
    grouped_entities, total_comparisons = match_entities(input_data, existing_groups) # takes care of all matching 
    #save_groups(grouped_entities) # save groups
    return grouped_entities, total_comparisons # just for debug and stats


if __name__ == "__main__":
    # result = system.run_pipeline(num_records=1)
    
    # Generate data
    raw_data = generate_data(10)

    # Generate compound keys
    compound_key_data = generate_compound_keys(raw_data)
    
    # Run matching
    grouped_entities, total_comparisons = run_matching(compound_key_data)
    print(f"Number of groups formed: {len(grouped_entities)}")

    # def calculate_similarity_exact(self, key1, key2, template1, template2):
    #     fields1 = template1.split('_')
    #     fields2 = template2.split('_')
    #     values1 = key1.split('_')
    #     values2 = key2.split('_')
        
    #     total_score = 0.0
    #     total_weight = 0.0
    #     comparisons = 0

    #     for field in set(fields1) & set(fields2):
    #         if field in self.config['weights']:
    #             comparisons += 1
    #             weight = self.config['weights'][field]
    #             index1 = fields1.index(field)
    #             index2 = fields2.index(field)
    #             if values1[index1] == values2[index2]:
    #                 total_score += weight
    #             total_weight += weight

    #     normalized_score = total_score / total_weight if total_weight > 0 else 0.0
    #     return normalized_score, comparisons

    # def group_similarity(self, entity_data, group_data):
    #     entity_type, entity_id, _, entity_key = entity_data[:4]  # Unpack only the first 4 elements
    #     link = entity_data[4] if len(entity_data) > 4 else 'None'  # Get link if it exists, otherwise None
    #     template, compound_info = entity_key.split(':')
    #     best_score = 0
    #     total_comparisons = 0
        
    #     for member in group_data:
    #         if member[0] == 'customer':  # Only compare entities of the same type
    #             _, member_id, _, member_key = member
    #             member_template, member_compound_info = member_key.split(':')
    #             score, comparisons = self.calculate_similarity_exact(compound_info, member_compound_info, template, member_template)

    #             total_comparisons += comparisons
    #             if score > best_score:
    #                 best_score = score

    #     return best_score, total_comparisons

    # def match_entities(self, all_data, existing_groups):
    #     grouped_entities = existing_groups.copy()
    #     unmatched_entities = []
    #     total_comparisons = 0

    #     for entity_data in all_data:
    #         # entity_type, entity_id, transaction, entity_key = entity_data

    #         entity_type, entity_id, transaction, entity_key = entity_data[:4]  # Unpack only the first 4 elements
    #         link = entity_data[4] if len(entity_data) > 4 else 'None'  # Get link if it exists, otherwise None

            

    #         # for group_id, group_data in grouped_entities.items():
    #         #     if entity_type == 'Customer':
    #         #         swap = 'Counter-Party'
    #         #     if entity_type == 'Counter-Party':
    #         #         swap = 'Customer'

    #         #     if any(member[1] == entity_id and swap == member[0] for member in group_data):
    #         #         continue
    #         #     elif any(member[1] == entity_id for member in group_data):
    #         #         grouped_entities[group_id].append(entity_data)
    #         #         continue
    #         if entity_type == 'Counter-Party':
                
    #             # Extract the original customer's ID from the transaction
    #             original_customer_id = transaction.split('_')[1]
                
    #             # Search for the original customer in existing groups
    #             customer_group = None
    #             for group_id, group_data in grouped_entities.items():
    #                 for member in group_data:
    #                     if member[0] == 'Customer':
    #                         if entity_id == member[1]:
    #                             link = group_id
    #                         if member[1] == original_customer_id:
    #                             customer_group = group_id

                    
                
    #             if customer_group:
    #                 entity_data.append(link)
    #                 grouped_entities[customer_group].append(entity_data)
    #                 continue
    #         elif entity_type != 'Customer':
    #             continue  # Skip non-customer and non-Counter-Party entities

    #         # If no match found or not a Counter-Party, proceed with regular matching
    #         counterParty_id = None
    #         transaction_parts = transaction.split('_')
    #         if transaction_parts[0] in ['send', 'receive']:
    #             counterParty_id = transaction_parts[1]

    #         best_group = None
    #         best_score = 0

    #         for group_id, group_data in grouped_entities.items():
    #             add = True
    #             for member in group_data:
                    
    #                 if member[0] =='Customer':

    #                     if member[1] == counterParty_id:
    #                         link = group_id
    #                         # entity_data.append(group_id)


    #             score, comparisons = self.group_similarity(entity_data, group_data)
    #             total_comparisons += comparisons
    #             if score > best_score and score >= self.config['threshold']:
    #                 best_score = score
    #                 best_group = group_id
    #         entity_data.append(link)
    #         if best_group:
                
    #             grouped_entities[best_group].append(entity_data)
    #         else:
    #             new_group_id = str(uuid.uuid4())
    #             if entity_type == 'Customer':
    #                 new_entity=['Entity',new_group_id,transaction,entity_key,'test']
    #             #unmatched_entities.append(entity_data)
    #                 grouped_entities[new_group_id] = [new_entity]
    #                 grouped_entities[new_group_id].append(entity_data)
    #                 self.save_entity_data(new_group_id,entity_data)


    #     return grouped_entities, total_comparisons

