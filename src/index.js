import dotenv from "dotenv";
dotenv.config({path: "./.env"});
import connectDB from "./db/index.js";
import app from "./app.js";

const PORT = process.env.PORT || 8000;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at ${PORT}`);
    });
    app.on("error", (error) => {
      console.log("err", error);
      throw error;
    });
  })
  .catch((err) => {
    console.log(`MONGO DB connection failed: ${err}`);
  });


















/*
(async () => {
  try {
    mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("err", error);
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log(`App is listening on ${process.env.PORT}`);
    //   console.log(`Database connection established`);
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
})();
*/
