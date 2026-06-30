const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// -------- Firebase Admin Initialization (Safe & Secure) ----------
const fbServiceKeyBase64 = process.env.FB_SERVICE_KEY;

if (!fbServiceKeyBase64) {
  console.error("❌ Error: 'FB_SERVICE_KEY' environment variable is missing!");
  process.exit(1);
}

try {
  if (!admin.apps.length) {
    const decodedKey = Buffer.from(fbServiceKeyBase64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decodedKey);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🚀 Firebase Admin successfully initialized!");
  }
} catch (error) {
  console.error("❌ Firebase Initialization Error:", error.message);
  process.exit(1);
}

// -------- MongoDB Connection ----------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4moveuh.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
  },
  tls: true,
  tlsAllowInvalidCertificates: false
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("🎯 Pinged your deployment. You successfully connected to MongoDB!");

    const db = client.db('my_app');
    const cosmeticsCollection = db.collection('cosmetics');
    const skinCollection = db.collection('skin');
    const makeupCollection = db.collection('makeupcosmetics');
    const babyCollection = db.collection('babyCosmetics');
    const cartCollection = db.collection('cartItem');
    const userCollection = db.collection('users');
    const reviewCollection = db.collection('review');
    const orderCollection = db.collection('order');

    // 🛡️ JWT & Firebase Token Verification Middleware (FIXED)
    const verifyToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'Unauthorized access: Token missing' });
      }

      const token = authHeader.split(' ')[1];

      try {
        // Option A: Verify via Firebase Admin (If you are using Firebase tokens on frontend)
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
      } catch (fbError) {
        // Option B: Fallback to custom JWT verification
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (jwtError, decodedJWT) => {
          if (jwtError) {
            return res.status(403).send({ message: 'Forbidden access: Invalid token' });
          }
          req.decoded = decodedJWT;
          next();
        });
      }
    };

    // ---------------- JWT API ----------------
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    // ---------------- Orders API ----------------
    app.post('/order', async (req, res) => {
      const result = await orderCollection.insertOne(req.body);
      res.send(result);
    });

    app.get('/orders', async (req, res) => {
      try {
        const orders = await orderCollection.find({}).toArray();
        res.json(orders);
      } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.patch('/orders/:id/confirm', async (req, res) => {
      try {
        const result = await orderCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { confirmed: true } }
        );
        res.json({ modifiedCount: result.modifiedCount });
      } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // ---------------- Users API ----------------
    app.post('/users', async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
      try {
        const user = await userCollection.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({
          name: user.name || 'Guest',
          email: user.email,
          role: user.role || 'user'
        });
      } catch (err) {
        res.status(500).json({ message: 'Failed to get user info' });
      }
    });

    app.get('/users/:email/role', async (req, res) => {
      try {
        const user = await userCollection.findOne({ email: req.params.email });
        if (!user) return res.status(404).send({ message: 'user not found' });
        res.send({ role: user.role || 'user' });
      } catch (error) {
        res.status(500).send({ message: 'Failed to get role' });
      }
    });

    app.patch('/users/:id/role', async (req, res) => {
      const { role } = req.body;
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).send({ message: "Invalid Role" });
      }
      try {
        const result = await userCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { role } }
        );
        res.send({ message: `User role updated to ${role}`, result });
      } catch (error) {
        res.status(500).send({ message: 'Failed to update user role' });
      }
    });

    app.delete('/users/:id', async (req, res) => {
      const result = await userCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const result = await userCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { role: 'admin' } }
      );
      res.send(result);
    });

    // ---------------- Skin API ----------------
    app.post('/skin', async (req, res) => res.send(await skinCollection.insertOne(req.body)));
    app.get('/skin', async (req, res) => res.send(await skinCollection.find().toArray()));
    app.get('/skin/:id', async (req, res) => {
      res.send(await skinCollection.findOne({ _id: new ObjectId(req.params.id) }));
    });
    app.delete('/skin/:id', async (req, res) => {
      res.send(await skinCollection.deleteOne({ _id: new ObjectId(req.params.id) }));
    });
    app.put('/skin/:id', async (req, res) => {
      const result = await skinCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body },
        { upsert: true }
      );
      res.send(result);
    });

    // ---------------- Cosmetics API ----------------
    app.post('/cosmetics', async (req, res) => res.send(await cosmeticsCollection.insertOne(req.body)));
    app.get('/cosmetics', async (req, res) => res.send(await cosmeticsCollection.find().toArray()));
    app.get('/cosmetics/:id', async (req, res) => {
      res.send(await cosmeticsCollection.findOne({ _id: new ObjectId(req.params.id) }));
    });
    app.delete('/cosmetics/:id', async (req, res) => {
      res.send(await cosmeticsCollection.deleteOne({ _id: new ObjectId(req.params.id) }));
    });
    app.put('/cosmetics/:id', async (req, res) => {
      const result = await cosmeticsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body },
        { upsert: true }
      );
      res.send(result);
    });

    // ---------------- Makeup API ----------------
    app.post('/makeupcosmetics', async (req, res) => res.send(await makeupCollection.insertOne(req.body)));
    app.get('/makeupcosmetics', async (req, res) => res.send(await makeupCollection.find().toArray()));
    app.get('/makeupcosmetics/:id', async (req, res) => {
      res.send(await makeupCollection.findOne({ _id: new ObjectId(req.params.id) }));
    });
    app.delete('/makeupcosmetics/:id', async (req, res) => {
      res.send(await makeupCollection.deleteOne({ _id: new ObjectId(req.params.id) }));
    });
    app.put('/makeupcosmetics/:id', async (req, res) => {
      const result = await makeupCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body },
        { upsert: true }
      );
      res.send(result);
    });

    // ---------------- Baby API ----------------
    app.post('/babyCosmetics', async (req, res) => res.send(await babyCollection.insertOne(req.body)));
    app.get('/babyCosmetics', async (req, res) => res.send(await babyCollection.find().toArray()));
    app.get('/babyCosmetics/:id', async (req, res) => {
      res.send(await babyCollection.findOne({ _id: new ObjectId(req.params.id) }));
    });
    app.delete('/babyCosmetics/:id', async (req, res) => {
      res.send(await babyCollection.deleteOne({ _id: new ObjectId(req.params.id) }));
    });
    app.put('/babyCosmetics/:id', async (req, res) => {
      const result = await babyCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body },
        { upsert: true }
      );
      res.send(result);
    });

    // ---------------- Cart API ----------------
    app.post('/cartItem', async (req, res) => res.send(await cartCollection.insertOne(req.body)));
    app.get('/cartItem', async (req, res) => {
      res.send(await cartCollection.find({ email: req.query.email }).toArray());
    });
    app.delete('/cartItem/:id', async (req, res) => {
      res.send(await cartCollection.deleteOne({ _id: new ObjectId(req.params.id) }));
    });
    app.delete('/cartItem', async (req, res) => {
      try {
        const userEmail = req.query.email;
        if (!userEmail) return res.status(400).json({ message: 'Email is required' });
        const result = await cartCollection.deleteMany({ email: userEmail });
        res.json({ deletedCount: result.deletedCount });
      } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // ---------------- Review API ----------------
    app.post('/review', async (req, res) => res.send(await reviewCollection.insertOne(req.body)));
    app.get('/review', async (req, res) => res.send(await reviewCollection.find().toArray()));
    app.delete('/review/:id', async (req, res) => {
      res.send(await reviewCollection.deleteOne({ _id: new ObjectId(req.params.id) }));
    });

  } catch (error) {
    console.error("Database connection failure:", error);
  }
}

// Run DB setup
run().catch(console.dir);

// Root Endpoint
app.get('/', (req, res) => {
  res.send("✨ Server is successfully running!");
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server listening on PORT: ${port}`);
});