# MongoDB Setup Instructions

## Setting up MongoDB Connection

1. Create a `.env.local` file in the root directory of your project
2. Add your MongoDB connection string to the file:

```
MONGODB_URI=mongodb+srv://lior345622:JKTAas1uTa0psQgT@cluster0.zttbjsy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

3. Make sure to never commit this file to version control (it's already in .gitignore)

## Testing the Connection

Once you've set up the `.env.local` file, you can test the MongoDB connection by:

1. Starting the development server:
```
npm run dev
```

2. Navigate to the home page in your browser:
```
http://localhost:3000
```

The page will display your MongoDB data if the connection is successful. If there's an issue with the connection, you'll see appropriate error messages in the console.

## Using MongoDB in Your Application

The project has been set up with the following MongoDB utilities:

- `src/lib/mongodb.ts` - Handles the MongoDB client connection
- `src/lib/db.ts` - Provides utility functions for common database operations
- `src/app/components/MongoDBExample.tsx` - Server component for data fetching
- `src/app/components/MongoDBClient.tsx` - Client component for interactive features

To use MongoDB in your application:

1. Update the database and collection names in the components to match your MongoDB setup
2. Create appropriate TypeScript interfaces for your data models in `src/types/index.ts`
3. Use the utility functions from `src/lib/db.ts` to interact with your MongoDB collections

## Security Note

Keep your MongoDB connection string secure and never expose it in client-side code. All MongoDB operations should be performed in server components or API routes.
