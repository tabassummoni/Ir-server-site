const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const admin = require("firebase-admin");
const serverless = require("serverless-http");

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

// -------- Firebase Admin Initialization ----------
const decodedKey = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decodedKey);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// -------- MongoDB Connection ----------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4moveuh.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1 },
  tls: true,
  tlsAllowInvalidCertificates: false
});

let collections = {};

async function connectDB() {
  await client.connect();
  const db = client.db("my_app");

  collections = {
    cosmetics: db.collection("cosmetics"),
    skin: db.collection("skin"),
    makeup: db.collection("makeupcosmetics"),
    baby: db.collection("babyCosmetics"),
    cart: db.collection("cartItem"),
    users: db.collection("users"),
    review: db.collection("review"),
    order: db.collection("order")
  };
}
connectDB().catch(console.error);

// -------------- Routes ---------------------

// JWT Issue
app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  res.send({ token });
});

// ---------------- Orders ----------------
app.post('/order', async (req, res) => {
  const result = await collections.order.insertOne(req.body);
  res.send(result);
});

app.get('/orders', async (req, res) => {
  res.send(await collections.order.find().toArray());
});

app.patch('/orders/:id/confirm', async (req, res) => {
  const result = await collections.order.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { confirmed: true } }
  );
  res.send(result);
});

// ---------------- Users ----------------
app.post('/users', async (req, res) => {
  const { email } = req.body;
  const exists = await collections.users.findOne({ email });

  if (exists) return res.send({ message: 'user already exists', insertedId: null });

  const result = await collections.users.insertOne(req.body);
  res.send(result);
});

app.get('/users', async (req, res) => {
  res.send(await collections.users.find().toArray());
});

app.get('/users/:email', async (req, res) => {
  const user = await collections.users.findOne({ email: req.params.email });
  if (!user) return res.status(404).send({ message: 'User not found' });

  res.send({
    name: user.name || 'Guest',
    email: user.email,
    role: user.role || 'user'
  });
});

app.get('/users/:email/role', async (req, res) => {
  const user = await collections.users.findOne({ email: req.params.email });
  if (!user) return res.status(404).send({ message: 'User not found' });

  res.send({ role: user.role || 'user' });
});

app.patch('/users/:id/role', async (req, res) => {
  const result = await collections.users.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role: req.body.role } }
  );
  res.send(result);
});

app.delete('/users/:id', async (req, res) => {
  const result = await collections.users.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
});

// ---------------- Skin ----------------
app.post('/skin', async (req, res) => res.send(await collections.skin.insertOne(req.body)));
app.get('/skin', async (req, res) => res.send(await collections.skin.find().toArray()));
app.get('/skin/:id', async (req, res) => {
  res.send(await collections.skin.findOne({ _id: new ObjectId(req.params.id) }));
});
app.put('/skin/:id', async (req, res) => {
  const result = await collections.skin.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body },
    { upsert: true }
  );
  res.send(result);
});

// ---------------- Cosmetics ----------------
app.post('/cosmetics', async (req, res) => res.send(await collections.cosmetics.insertOne(req.body)));
app.get('/cosmetics', async (req, res) => res.send(await collections.cosmetics.find().toArray()));
app.get('/cosmetics/:id', async (req, res) => {
  res.send(await collections.cosmetics.findOne({ _id: new ObjectId(req.params.id) }));
});
app.put('/cosmetics/:id', async (req, res) => {
  const result = await collections.cosmetics.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body },
    { upsert: true }
  );
  res.send(result);
});

// ---------------- Makeup ----------------
app.post('/makeupcosmetics', async (req, res) => res.send(await collections.makeup.insertOne(req.body)));
app.get('/makeupcosmetics', async (req, res) => res.send(await collections.makeup.find().toArray()));
app.get('/makeupcosmetics/:id', async (req, res) => {
  res.send(await collections.makeup.findOne({ _id: new ObjectId(req.params.id) }));
});
app.put('/makeupcosmetics/:id', async (req, res) => {
  const result = await collections.makeup.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body },
    { upsert: true }
  );
  res.send(result);
});

// ---------------- Baby ----------------
app.post('/babyCosmetics', async (req, res) => res.send(await collections.baby.insertOne(req.body)));
app.get('/babyCosmetics', async (req, res) => res.send(await collections.baby.find().toArray()));
app.get('/babyCosmetics/:id', async (req, res) => {
  res.send(await collections.baby.findOne({ _id: new ObjectId(req.params.id) }));
});
app.put('/babyCosmetics/:id', async (req, res) => {
  const result = await collections.baby.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body },
    { upsert: true }
  );
  res.send(result);
});

// ---------------- Cart ----------------
app.post('/cartItem', async (req, res) => res.send(await collections.cart.insertOne(req.body)));
app.get('/cartItem', async (req, res) => {
  const items = await collections.cart.find({ email: req.query.email }).toArray();
  res.send(items);
});
app.delete('/cartItem/:id', async (req, res) => {
  res.send(await collections.cart.deleteOne({ _id: new ObjectId(req.params.id) }));
});
app.delete('/cartItem', async (req, res) => {
  const result = await collections.cart.deleteMany({ email: req.query.email });
  res.send(result);
});

// ---------------- Review ----------------
app.post('/review', async (req, res) => res.send(await collections.review.insertOne(req.body)));
app.get('/review', async (req, res) => res.send(await collections.review.find().toArray()));
app.delete('/review/:id', async (req, res) => {
  res.send(await collections.review.deleteOne({ _id: new ObjectId(req.params.id) }));
});

// Root
app.get('/', (req, res) => {
  res.send("✨ Server running on Vercel (Serverless)");
});

// MUST EXPORT serverless app
module.exports = serverless(app);




// const express = require('express');
// const cors = require('cors')
// const app = express();
// require('dotenv').config();
// const jwt = require('jsonwebtoken');
// const admin = require("firebase-admin");




// const port = process.env.PORT || 4000;
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// app.use(cors());
// app.use(express.json())

// const decodedKey = Buffer.from(process.env.FB_SERVICE_KEY,'base64').toString('utf8');
// const serviceAccount = JSON.parse(decodedKey);

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });


// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4moveuh.mongodb.net/?retryWrites=true&w=majority`;
// // const uri = `${process.env.MONGODB_URI}`
// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     // strict: true,
//     // deprecationErrors: true,
//   },
//   tls: true,
//   tlsAllowInvalidCertificates: false
// });

// async function run() {
//   try {
//    // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     //Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");

//     const cosmeticsCollection = client.db('my_app').collection('cosmetics');
//     const skinCollection = client.db('my_app').collection('skin');
//     const makeupCollection = client.db('my_app').collection('makeupcosmetics');
//     const babyCollection = client.db('my_app').collection('babyCosmetics');
//     const cartCollection = client.db('my_app').collection('cartItem');
//     const userCollection = client.db('my_app').collection('users');
//     const reviewCollection = client.db('my_app').collection('review');
//     const orderCollection = client.db('my_app').collection('order');


//     //middlewares\
//     const verifyToken = async (req, res, next) => {

//       if (!req.headers.authorization) {
//         return res.status(401).send({ message: 'forbidden access' });

//       }
//       //verify the token
//       try {
//         const decoded = await admin.auth().verifyIdToken(token);
//         req.decoded = decoded;
//         next();
//       }
//       catch (error) {
//         return res.status(403).send({ message: 'forbidden access' })
//       }
//       const token = req.headers.authorization.split(' ')[1];
//       jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err) => {
//         if (err) {
//           return res.status(401).send({ message: 'forbidden access' })
//         }
//       }
//       )
//     }
//     //jwt related api 
//     app.post('/jwt', async (req, res) => {
//       const user = req.body;
//       const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
//       res.send({ token });
//     })
//     //order
//     app.post('/order', async (req, res) => {
//       const newdata = req.body;
//       const result = await orderCollection.insertOne(newdata);
//       res.send(result);

//     })

//     // GET all orders (optional)
//    app.get('/orders', async (req, res) => {
//   try {
//     const orders = await orderCollection.find({}).toArray();
//     res.json(orders);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // PATCH /orders/:id/confirm
// app.patch('/orders/:id/confirm', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await orderCollection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: { confirmed: true } }
//     );
//     res.json({ modifiedCount: result.modifiedCount });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });
//     //users api
//     app.post('/users', async (req, res) => {
//       const user = req.body;
//       const query = { email: user.email }
//       const existingUser = await userCollection.findOne(query)
//       if (existingUser) {
//         return res.send({ message: 'user already exists', insertedId: null })
//       }
//       const result = await userCollection.insertOne(user);
//       res.send(result);

//     })

//     app.get('/users', async (req, res) => {

//       const cursor = userCollection.find();
//       const result = await cursor.toArray();
//       res.send(result);
//     })
//     app.get('/users/:email', async (req, res) => {
//   try {
//     const email = req.params.email;

//     if (!email) {
//       return res.status(400).json({ message: 'Email is required' });
//     }

//     const user = await userCollection.findOne({ email });

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Only send safe fields
//     res.json({
//       name: user.name || 'Guest',
//       email: user.email,
//       role: user.role || 'user'
//     });
//   } catch (err) {
//     console.error('Error fetching user', err);
//     res.status(500).json({ message: 'Failed to get user info' });
//   }
// });
//     app.get('/users/:email/role', async (req, res) => {
//       try {
//         const email = req.params.email;
//         if (!email) {
//           return res.status(400).send({ message: 'email is required' });

//         }
//         const user = await userCollection.findOne({ email });
//         if (!user) {
//           return res.status(400).send({ message: 'user not found' })
//         }
//         res.send({ role: user.role || 'user' });
//       } catch (error) {
//         console.error('Error getting user role', error);
//         res.status(500).send({ message: 'Faild to get role...' })
//       }

//     });
//     app.patch('/users/:id/role', async (req, res) => {
//       const { id } = req.params;
//       const { role } = req.body;
//       if (!['admin', 'user'].includes(role)) {
//         return res.status(400).send({ message: "Invalid Role" });
//       }
//       try {
//         const result = await userCollection.updateOne(
//           { _id: new ObjectId(id) },
//           { $set: { role } }
//         );
//         res.send({ message: `User role updated to ${role}`, result });
//       } catch (error) {
//         console.error('Error updating user role', error);
//         res.status(500).send({ message: 'Faild to update user role' })
//       }
//     })
//     app.delete('/users/:id', async (req, res) => {
//       console.log(req)
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await userCollection.deleteOne(query);
//       console.log(result);
//       res.send(result);
//     })
//     app.patch('/users/admin/:id', async (req, res) => {
//       const id = req.params.id;
//       const filter = { _id: new ObjectId(id) };
//       const updatedDoc = {
//         $set: {
//           role: 'admin'
//         }
//       }
//       const result = await userCollection.updateOne(filter, updatedDoc);
//       res.send(result);
//     })
// //skin api
//     app.post('/skin', async (req, res) => {
//       const newdata = req.body;
//       const result = await skinCollection.insertOne(newdata);
//       res.send(result);

//     })
//     app.get('/skin', async (req, res) => {
//       const cursor = skinCollection.find();
//       const result = await cursor.toArray();
//       res.send(result);
//     })
//     app.get('/skin/:id', async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await skinCollection.findOne(query);
//       res.send(result);

//     });
//     app.delete('/skin/:id', async (req, res) => {
//       console.log(req)
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await skinCollection.deleteOne(query);
//       console.log(result);
//       res.send(result);
//     })
//     app.put('/skin/:id', async (req, res) => {
//       const id = req.params.id;
//       const skinProduct = req.body;
//       console.log(skinProduct);
//       const filter = { _id: new ObjectId(id) }
//       const options = { upsert: true }
//       const updateSkinProduct = {

//         $set: {
//           name: skinProduct.name,
//           price: skinProduct.price,
//           details: skinProduct.details,
//           expiration: skinProduct.expiration
//         }
//       }
//       const result = await skinCollection.updateOne(filter, updateSkinProduct, options)
//       res.send(result)
//     })

// //hair api  
//     app.delete('/cosmetics/:id', async (req, res) => {
//       console.log(req)
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await cosmeticsCollection.deleteOne(query);
//       console.log(result);
//       res.send(result);
//     })
//     app.get('/cosmetics', async (req, res) => {
//       const cursor = cosmeticsCollection.find();
//       const result = await cursor.toArray();
//       res.send(result);
//     })
//     app.get('/cosmetics/:id', async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await cosmeticsCollection.findOne(query);
//       res.send(result);

//     });
//     app.post('/cosmetics', async (req, res) => {
//       const newdata = req.body;
//       const result = await cosmeticsCollection.insertOne(newdata);
//       res.send(result);

//     })
//     app.put('/cosmetics/:id', async (req, res) => {
//       const id = req.params.id;
//       const haiarCosmetics = req.body;
//       console.log(haiarCosmetics);
//       const filter = { _id: new ObjectId(id) }
//       const options = { upsert: true }
//       const updatehaiarCosmetics = {

//         $set: {
//           name: haiarCosmetics.name,
//           price: haiarCosmetics.price,
//           details: haiarCosmetics.details,
//           expiration: haiarCosmetics.expiration
//         }
//       }
//       const result = await cosmeticsCollection.updateOne(filter, updatehaiarCosmetics, options)
//       res.send(result)
//     })
// //makeUp
//     app.delete('/makeupcosmetics/:id', async (req, res) => {
//       console.log(req)
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await makeupCollection.deleteOne(query);
//       console.log(result);
//       res.send(result);
//     })
//     app.get('/makeupcosmetics', async (req, res) => {
//       const cursor = makeupCollection.find();
//       const result = await cursor.toArray();
//       res.send(result);
//     })
//     app.get('/makeupcosmetics/:id', async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await makeupCollection.findOne(query);
//       res.send(result);

//     });
//     app.post('/makeupcosmetics', async (req, res) => {
//       const newdata = req.body;
//       const result = await makeupCollection.insertOne(newdata);
//       res.send(result);
//     })
//     app.put('/makeupcosmetics/:id', async (req, res) => {
//       const id = req.params.id;
//       const makeUpCosmetics = req.body;
//       console.log(makeUpCosmetics);
//       const filter = { _id: new ObjectId(id) }
//       const options = { upsert: true }
//       const updatemakeUpCosmetics = {

//         $set: {
//           name: makeUpCosmetics.name,
//           price: makeUpCosmetics.price,
//           details: makeUpCosmetics.details,
//           expiration: makeUpCosmetics.expiration
//         }
//       }
//       const result = await makeupCollection.updateOne(filter, updatemakeUpCosmetics, options)
//       res.send(result)
//     })
// //Baby
//     app.delete('/babyCosmetics/:id', async (req, res) => {
//       console.log(req)
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await babyCollection.deleteOne(query);
//       console.log(result);
//       res.send(result);
//     })
//     app.get('/babyCosmetics', async (req, res) => {
//       const cursor = babyCollection.find();
//       const result = await cursor.toArray();
//       res.send(result);
//     })
//     app.get('/babyCosmetics/:id', async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await babyCollection.findOne(query);
//       res.send(result);

//     });
//     app.post('/babyCosmetics', async (req, res) => {
//       const newdata = req.body;
//       const result = await babyCollection.insertOne(newdata);
//       res.send(result);
//     })
//     app.put('/babyCosmetics/:id', async (req, res) => {
//       const id = req.params.id;
//       const babyProduct = req.body;
//       console.log(babyProduct);
//       const filter = { _id: new ObjectId(id) }
//       const options = { upsert: true }
//       const updatebabyProduct = {

//         $set: {
//           name: babyProduct.name,
//           price: babyProduct.price,
//           details: babyProduct.details,
//           expiration: babyProduct.expiration
//         }
//       }
//       const result = await babyCollection.updateOne(filter, updatebabyProduct, options)
//       res.send(result)
//     })

// //cart Api
//     app.delete('/cartItem/:id', async (req, res) => {
//       console.log(req)
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await cartCollection.deleteOne(query);
//       console.log(result);
//       res.send(result);
//     })
//     app.get('/cartItem', async (req, res) => {
//       const email = req.query.email;
//       const query = { email: email };
//       const cursor = cartCollection.find(query);
//       const result = await cursor.toArray();
//       res.send(result);
//     })
//     app.delete('/cartItem', async (req, res) => {
//   try {
//     const userEmail = req.query.email;
//     if (!userEmail) {
//       return res.status(400).json({ message: 'Email is required' });
//     }

//     const result = await cartCollection.deleteMany({ email: userEmail });
//     res.json({
//       deletedCount: result.deletedCount,
//       message: `${result.deletedCount} item(s) deleted for ${userEmail}`,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
//     });
//     app.post('/cartItem', async (req, res) => {
//       const newdata = req.body;
//       const result = await cartCollection.insertOne(newdata);
//       res.send(result);

//     })
// //reviwe api
//     app.get('/review', async (req, res) => {
//       const cursor = reviewCollection.find();
//       const result = await cursor.toArray();
//       res.send(result);
//     })
//     app.delete('/review/:id', async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) }
//       const result = await reviewCollection.deleteOne(query);
//       res.send(result);

//     });
//     app.post('/review', async (req, res) => {
//       const newdata = req.body;
//       const result = await reviewCollection.insertOne(newdata);
//       res.send(result);

//     })
   
//   }


//   finally {

//   //  await client.close();
//   }
// }
// run().catch(console.dir);

// app.get('/', (req, res) => {
//   res.send("server is running ");
// })

// app.listen(port, () => {
//   console.log(`server is running dc on PORT :${port}`)
// })  