import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.connection.on('connected', () => console.log("Database Connected"));
    mongoose.connection.on('error', (err) => console.error("Database connection error:", err.message));

    try {
        let uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error("Error: MONGODB_URI is not set in environment variables!");
            return;
        }

        // Clean up URI: ensure /prescripto database is inserted before query parameters
        if (uri.includes('/prescripto')) {
            await mongoose.connect(uri);
        } else if (uri.includes('?')) {
            const [base, query] = uri.split('?');
            const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
            await mongoose.connect(`${cleanBase}/prescripto?${query}`);
        } else {
            const cleanUri = uri.endsWith('/') ? uri.slice(0, -1) : uri;
            await mongoose.connect(`${cleanUri}/prescripto`);
        }
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
    }
}

export default connectDB;