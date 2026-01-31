import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// setting options for cookie
const cookieOptions={
    httpOnly:true,
    secure:true
};

const generateAccessAndRefreshToken = async (user)=>{
    try{
        const findUser= await User.findById(user._id);
        const accessToken=findUser.generateAccessToken();
        const refreshToken=findUser.generateRefreshToken();
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false});
        return {accessToken,refreshToken,user};
    }
    catch(error){
        throw new ApiError(500,"Error in generating tokens");
    }
}

const registerUser = asyncHandler( async (req,res)=> {

    // getting user details from frontend
    const {fullName, email, username, password } = req.body

    // validation - not empty
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exists using email and username
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // check if avatar image is present and cover image is optional
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    // upload them to cloudinary
    const avatar = await uploadToCloudinary(avatarLocalPath)
    const coverImage = await uploadToCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   
    // creating database entry for user
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    // removing password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // returning response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler( async (req,res)=> {
    const {username,email,password}=req.body;
    if(!email && !username){
        throw new ApiError(400,"Username or Email is required to login");
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })
    if(!user) throw new ApiError(400,"User doesnt exist");

    const isPasswordValid=await user.isPasswordValid(password);
    if(!isPasswordValid) throw new ApiError(401,"Invalid credentials");

    const {accessToken, refreshToken, user: updatedUser} = await generateAccessAndRefreshToken(user);
    if(!accessToken || !refreshToken) throw new ApiError(500, "Error in generating tokens");

    const loggedInUser = updatedUser.toObject();
    delete loggedInUser.password;
    delete loggedInUser.refreshToken;

    

    return res.
    status(200).
    cookie("refreshToken", refreshToken, cookieOptions).
    cookie("accessToken", accessToken, cookieOptions).
    json(
        new ApiResponse(200, {loggedInUser, accessToken, refreshToken}, "User logged in successfully")
    );
})

const logoutUser = asyncHandler( async (req,res)=> {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined // this removes the field from document
            }
        },
        {
            new: true
        }
    )
    return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged Out"))
});

const refreshAccessToken = asyncHandler( async (req,res)=> {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh Token is required")
    }

    try {
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,)
        
        const user=await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401,"User for this token doesnt exist");
        } 
        if(user?.refreshToken !== incomingRefreshToken){
            throw new ApiError(401,"Refresh token mismatch. Please login again");
        }
    
        const {accessToken, refreshToken: newrefreshToken, user: updatedUser} = await generateAccessAndRefreshToken(user);
        if(!accessToken || !newrefreshToken) throw new ApiError(500, "Error in generating tokens");
    
        return res.
        status(200).
        cookie("refreshToken", newrefreshToken, cookieOptions).
        cookie("accessToken", accessToken, cookieOptions).
        json(
            new ApiResponse(200, {accessToken, refreshToken: newrefreshToken}, "Access token refreshed successfully")
        );
    } catch (error) {
        throw new ApiError(400,error?.message || "Invalid refresh token");
    }
});

export {registerUser, loginUser, logoutUser, refreshAccessToken};