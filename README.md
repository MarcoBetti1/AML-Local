### Overview
This is an entity resolution app. It has a frontent web made with node.js. First time on front end I definitely struggled there. There is a data generation componenent. Currently it can only be tiggered through running the main or the method `generate_data`. Note this is a work in progress.

The matching function works by comparing values of like types stored in compound keys. There is some threshold and weights that can be manually adjusted in the config.yaml.

`run.py` will start the web application

  I will work on improving this once I have some time.

## Bugs and improvements
- Business link is on the customer not the business
- Saving graph displayed
- Adding report features
- Making the matching user adjustable, and can be activated through the application
- Make the data more complex, maybe bad actors generated or make a custom dataset with a story
- Improve UI entity details area A lot
- Make config adjustable from application
