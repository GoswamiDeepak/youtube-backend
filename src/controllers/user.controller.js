import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
    uploadOnCloudinary,
    removeFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const generateAccessTokenAndRefreshToken = async (userId) => {
    let user = await User.findById(userId);
    let accessToken = user.generateAccessToken();
    let refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return {
        accessToken,
        refreshToken,
    };
};

const options = {
    httpOnly: true,
    secure: true,
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const { fullname, email, password, username } = req.body;
    if (
        [fullname, email, password, username].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields must not be empty !");
    }
    const existUser = await User.findOne({
        $or: [{ username: username }, { email: email }],
    });

    if (existUser) {
        throw new ApiError(409, "User already exists");
    }
    const avatarLocalPath =
        req.files?.avatar &&
        req.files.avatar.length > 0 &&
        req.files.avatar[0].path;

    // const coverLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required from file!");
    }
    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // create user object - create entry in db
    const user = await User.create({
        fullname,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar?.url,
        coverImage: coverImage?.url || "",
    });

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // check for user creation
    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user!"
        );
    }
    // return res
    res.status(201).json(
        new ApiResponce(200, createdUser, "user registration successful !")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie
    const { password, userdata } = req.body;

    const isUser = await User.findOne({
        $or: [{ username: userdata }, { email: userdata }],
    }).select("-createdAt -updatedAt -__v");

    if (!isUser) {
        throw new ApiError(404, "User not found!");
    }
    const isPasswordCorrect = await isUser.isPasswordCorrect(
        password.toString()
    );

    if (!isPasswordCorrect) {
        throw new ApiError(403, "Credential is incorrect!");
    }
    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(isUser._id);
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponce(
                200,
                {
                    user: isUser,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                },
                "User logged in successfully!"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: undefined,
            },
        },
        { new: true }
    );

    res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponce(200, "User is logged out!"));
});

const refreshAccessToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    try {
        const decodedRefreshToken = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        if (!decodedRefreshToken) {
            throw new ApiError("401", "Invalid refresh Token!");
        }
        const user = await User.findById(decodedRefreshToken._id);
        if (!user) {
            throw new ApiError("404", "User not Found!");
        }
        if (user.refreshToken !== refreshToken) {
            throw new ApiError("409", "Invalid refresh Token send !");
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessTokenAndRefreshToken(user._id);
        res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponce(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Generated new refreshToken"
                )
            );
    } catch (error) {
        throw new ApiError(500, error.message || "server error");
    }
};

const getCurrentUser = async (req, res) => {
    res.status(200).json(
        new ApiResponce(200, { user: req.user }, "user detail")
    );
};

const changePassword = asyncHandler(async (req, res) => {
    const { oldpassword, newpassword } = req.body;
    const user = await User.findById(req.user._id);
    const isPasswordCorrect = user.isPasswordCorrect(oldpassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid Old password");
    }
    user.password = newpassword;
    await user.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponce(200, {}, "New Password updated!"));

    // const isPasswordValid = bcrypt.compare(
    //     oldpassword.toString(),
    //     user.password
    // );
    // if (!isPasswordValid) {
    //     throw new ApiError(401, "Invalid Old password");
    // }
    // await User.findByIdAndUpdate(
    //     user._id,
    //     {
    //         $set: {
    //             password: newpassword.toString(),
    //         },
    //     },
    //     {
    //         new: true,
    //     }
    // );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    console.log(req.body);
    try {
        const { email, fullname } = req.body;
        if (!email || !fullname) {
            throw new ApiError(400, "All fields required");
        }
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    email,
                    fullname,
                },
            },
            { new: true }
        );
        if (!user) {
            throw new ApiError(500, "Server issue");
        }

        return res
            .status(200)
            .json(new ApiResponce(200, user, "Field updated!"));
    } catch (error) {
        throw new ApiError(500, error.message || "server error");
    }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    try {
        const avatarLocalPath = req.file?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is missing");
        }

        //TODO: delete old image - assignment
        const removeAvatar = await removeFromCloudinary(req.user.avatar);
        console.log(removeAvatar);
        if (!removeAvatar) {
            throw new ApiError(400, "Error during remove old avatar ");
        }
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        console.log(avatar);
        if (!avatar.url) {
            throw new ApiError(400, "Error while uploading on avatar");
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar: avatar.url,
                },
            },
            { new: true }
        ).select("-password");

        res.status(200).json(new ApiResponce(200, user, "avatar updated!"));
    } catch (error) {
        throw new ApiError(500, error.message || "avatar image upload error!");
    }
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    try {
        const coverImageLocalPath = req.file?.path;

        if (!coverImageLocalPath) {
            throw new ApiError(400, "Cover Image file is missing");
        }

        //TODO: delete old image - assignment
        const removeCoverImage = await removeFromCloudinary(
            req.user.coverImage
        );
        console.log(removeCoverImage);
        if (!removeCoverImage) {
            throw new ApiError(400, "Error during remove old cover Image !");
        }
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        console.log(coverImage);
        if (!coverImage.url) {
            throw new ApiError(400, "Error while uploading on avatar");
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: coverImage.url,
                },
            },
            { new: true }
        ).select("-password");
        res.status(200).json(new ApiResponce(200, user, "avatar updated!"));
    } catch (error) {
        throw new ApiError(500, error.message || "avatar image upload error!");
    }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username.trim()) {
        throw new ApiError(400, "username is missing!");
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);
    console.log(channel);
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const watchHistory = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localFields: "watchHistory",
                foreignFields: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localFields: "owner",
                            foreignFields: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            $frist: "$owner",
                        },
                    },
                ],
            },
        },
    ]);

    if (!watchHistory) {
        throw new ApiError(401, "aggregation is not supported");
    }
    res.status(200).json(
        new ApiResponce(
            200,
            watchHistory[0],
            "Watch history fetched successfully"
        )
    );
});
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changePassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
