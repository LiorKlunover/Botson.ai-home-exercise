# This file will be used to document the process of the project

1. created next js project
2. downloaded the json file transformedFeeds.json to my computer and deploayd it to mongodb atlas into mydatabase.db , collections named feeds 

mongoimport --uri="mongodb+srv://lior345622:JKTAas1uTa0psQgT@cluster0.zttbjsy.mongodb.net/myDatabase?retryWrites=true&w=majority" --collection=feeds --file=transformedFeeds.json --mode=upsert --jsonArray

3. created connection to mongo with the file mongodb.ts, and intialize connection when app loaded with instrumentation.ts file
4. created types/index.ts file to handle types
5. created db.ts file to handle schema and model
6. created api/GetFeeds/route.ts file to handle api routes
7. created api/GetClients/route.ts file to handle api routes
8. created api/GetCountry/route.ts file to handle api routes

9. created dashboard page with the following components:
- TotalCard
- FeedGraphCard
- StatusDistributionCard
- ProgressMetricsCard
- FilterPanel
