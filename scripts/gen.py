from utils import config, data_config
import random
import uuid
from datetime import date
import string

def generate_random_coordinates():
    locations = []

    lat = random.uniform(-90, 90)
    lon = random.uniform(-180, 180)

    return f"{lat}{lon}"

def create_compound_key(record, template):
    fields = template.split('_')
    
    if all(field in record and record[field] is not None for field in fields):
        key_values = '_'.join(str(record[field]) for field in fields)
        return f"{template}:{key_values}"
    return None

def generate_compound_keys(records):
    compound_keys = []
    for record in records:
        best_key = None
        max_fields = 0
        for template in config['compound_key_templates']:
            key = create_compound_key(record, template)
            if key and len(template.split('_')) > max_fields:
                best_key = key
                max_fields = len(template.split('_'))
        
        if best_key:
            compound_keys.append([
                record['Type'],
                record['ID'],
                record['Transaction'],
                best_key,
            ])
    return compound_keys

def generate_data(num_records):
        with open(data_config['names_path'], 'r') as file:
            names = file.read().splitlines()
        with open(data_config['zip_codes_path'], 'r') as file:
            zip_codes = file.read().splitlines()
        with open(data_config['phone_numbers_path'], 'r') as file:
            phone_numbers = file.read().splitlines()
        with open(data_config['drivers_license_path'], 'r') as file:
            drivers_licenses = file.read().splitlines()
        with open(data_config['address_path'], 'r') as file:
            addresses = file.read().splitlines()

        records = []
        for _ in range(num_records):
            customer = generate_customer_record(names, zip_codes, phone_numbers, drivers_licenses, addresses)
            #print(customer)

            customer['Type'] = 'Customer'
            num_transactions = random.randint(2, 7)
            
            for _ in range(num_transactions):
                transaction_type = random.choice(config['transaction_types'])
                amount = random.uniform(10, 1000)
                location = 'NA'
                if random.randint(0,1)==1:
                    location = generate_random_coordinates()
                daytime = f'{generate_random_date()}-{random_time()}'
                if transaction_type in ['send', 'receive']:
                    counterparty = generate_customer_record(names, zip_codes, phone_numbers, drivers_licenses, addresses)
                    
                    sender_record = customer.copy()#Jon sends 5 to bob
                    sender_record['Transaction'] = generate_transaction(location,daytime,customer['ID'], counterparty['ID'], 'send', amount)
                    records.append(sender_record)

                    receiver_record = counterparty.copy() # bob gets 5 from jon
                    receiver_record['Type'] = 'Counter-Party'
                    receiver_record['Transaction'] = generate_transaction(location,daytime,customer['ID'], counterparty['ID'], 'receive', amount)
                    records.append(receiver_record)

                    counter_Customer = counterparty.copy() #bob gets 5 from jon
                    counter_Customer['Type'] = 'Customer'
                    counter_Customer['Transaction'] = generate_transaction(location,daytime,customer['ID'], counterparty['ID'], 'receive', amount)
                    records.append(counter_Customer)

                    customer_Counter = customer.copy() # Jon sends 5 to bob
                    customer_Counter['Type'] = 'Counter-Party'
                    customer_Counter['Transaction'] = generate_transaction(location,daytime,customer['ID'], counterparty['ID'], 'send', amount)
                    records.append(customer_Counter)

                elif transaction_type == 'buyGiftCard':

                    gift_card_record = customer.copy()
                    gift_card_record['Transaction'] = generate_transaction(location,daytime,customer['ID'], None, 'buyGiftCard', amount)
                    records.append(gift_card_record)

                elif transaction_type == 'billPay':
                    
                    business_id = random.randint(10000,99999)
                    bill_pay_record = customer.copy()
                    bill_pay_record['Transaction'] = generate_transaction(location,daytime,customer['ID'], business_id, 'billPay', amount)
                    records.append(bill_pay_record)

        return records

def random_time():
    hour = str(random.randint(0,24))
    minute = str(random.randint(0,60))
    return f'{hour}:{minute}'

def generate_transaction(location,daytime,sender_id, receiver_id, transaction_type, amount):
        if transaction_type == 'send':
            return f"{location}_{daytime}_send_{receiver_id}_{amount:.2f}"
        elif transaction_type == 'receive':
            return f"{location}_{daytime}_receive_{sender_id}_{amount:.2f}"
        elif transaction_type == 'buyGiftCard':
            return f"{location}_{daytime}_buyGiftCard_{amount:.2f}"
        elif transaction_type == 'billPay':
            return f"{location}_{daytime}_billPay_{receiver_id}_{amount:.2f}"
        
        
def generate_random_date(start_year=1900, end_year=2100):
    # Generate a random year, month, and day
    year = random.randint(start_year, end_year)
    month = random.randint(1, 12)
    # Ensure the day is valid for the month
    if month in {1, 3, 5, 7, 8, 10, 12}:  # Months with 31 days
        day = random.randint(1, 31)
    elif month in {4, 6, 9, 11}:  # Months with 30 days
        day = random.randint(1, 30)
    else:  # February
        if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):  # Leap year
            day = random.randint(1, 29)
        else:
            day = random.randint(1, 28)
    
    # Create a date object
    random_date = date(year, month, day)
    
    # Format the date as mm/dd/yy
    formatted_date = random_date.strftime('%m/%d/%y')
    return formatted_date

def generate_random_email(first_name, last_name):  # generates random email given first and last name
    # pick random domain
    domains = ['gmail', 'yahoo', 'edu.university', 'walmart', 'hotmail', 'aol']
    domain = domains[random.randint(0, 5)] + '.com'
    variations = set()

    # Base formats
    formats = [
        "{fn}.{ln}", "{ln}.{fn}",
        "{fi}.{ln}", "{li}.{fn}",
        "{fn}{num}.{ln}", "{ln}{num}.{fn}",
        "{fn}.{rand}{ln}", "{ln}.{rand}{fn}",
        "{fn}{rand}{ln}{num}", "{ln}{rand}{fn}{num}"
    ]

    while len(variations) < 10:
        num = random.randint(1, 99)
        rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=2))
        email = random.choice(formats).format(
            fn=first_name, ln=last_name,
            fi=first_name[0], li=last_name[0],
            num=num, rand=rand
        )
        variations.add(f"{email}@{domain}")

    return list(variations)[random.randint(0, len(list(variations)) - 1)]

def generate_unique_id():
    return f'{int(uuid.uuid4().int & ((1<<63)-1))}'  # Generate a positive long ID return as string

def generate_customer_record(names, zip_codes, phone_numbers, drivers_licenses, addresses):
        name = random.choice(names)
        name_parts = name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        return {
            "ID": generate_unique_id(),
            "FirstName": first_name,
            "LastName": last_name,
            "Email": generate_random_email(first_name, last_name),
            "PhoneNumber": random.choice(phone_numbers).replace("-", ""),
            "Zipcode": random.choice(zip_codes),
            "DriversLicense": random.choice(drivers_licenses),
            "Address": random.choice(addresses),
            "DOB": generate_random_date(start_year=1900, end_year=2003)
        }

