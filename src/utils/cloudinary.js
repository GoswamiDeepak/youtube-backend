import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const responce = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        // file has been uploaded successfull
        // console.log("file is uploaded on cloudinary ", responce.url);
        fs.unlinkSync(localFilePath);
        return responce;
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
};

const removeFromCloudinary = async (url) => {
    const public_id = url.split("/").pop().split(".")[0];
    console.log(public_id);
    try {
        const responce = await cloudinary.uploader.destroy(public_id);
        return responce;
    } catch (error) {
        console.log(error);
        return null;
    }
};
export { uploadOnCloudinary, removeFromCloudinary };
