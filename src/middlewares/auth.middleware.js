import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
// import { ApiError } from "../utils/ApiError.js";
import { ApiError } from "../utils/ApiError.js";

export const auth = async (req, res, next) => {
    // console.log(req.headers);
    // console.log(req.cookies);
    // console.log(req.header("Authorization"));
    // console.log(req.headers.authorization);
    // console.log(req);
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id).select(
            "-password -refreshToken -createdAt -updatedAt -__v"
        );
        if (!user) return res.status(401, "Invalid user Token!");

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");  
    }
};
