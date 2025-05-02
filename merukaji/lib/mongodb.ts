import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 120000,
}

let client;
let clientPromise: Promise<MongoClient>;

// Development: Use global variable to preserve connection across HMR
if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect()
            .catch(err => {
                console.error("MongoDB connection error in development:", err);
                throw err;
            });
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect()
        .catch(err => {
            console.error("MongoDB connection error in production:", err);
            throw err;
        });
}

export default clientPromise;

export async function checkConnection() {
    try {
        const client = await clientPromise;
        await client.db().command({ ping: 1 });
        return true;
    } catch (error) {
        console.error("Database connection check failed:", error);
        return false;
    }
}