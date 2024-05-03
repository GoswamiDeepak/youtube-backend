import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
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
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);
router.route("/login").post(loginUser);

//Protected routes
router.route("/logout").post(auth, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.get("/current-user", auth, getCurrentUser);
router.post("/change-password", auth, changePassword);
router.route("/update-account").patch(auth, updateAccountDetails);
router
    .route("/update-avatar")
    .patch(auth, upload.single("avatar"), updateUserAvatar);
router
    .route("/update-coverimage")
    .patch(auth, upload.single("coverImage"), updateUserCoverImage);
router.route("/c/:username").get(auth, getUserChannelProfile);
router.route("/history").get(auth, getWatchHistory);

export default router;
