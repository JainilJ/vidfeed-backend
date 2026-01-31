import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});
    
const uploadToCloudinary= async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        // uploading file to cloudinary
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto", // jpeg, png
        });
        // console.log("CLOUDINARY RESPONSE:", response);
        fs.unlinkSync(localFilePath); // remove file from local storage
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove file from local storage
        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;
        const response = await cloudinary.uploader.destroy(publicId);
        return response;
    } catch (error) {
        return null;
    }
};

export { uploadToCloudinary, deleteFromCloudinary };