import {Router} from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import verifyJWT from "../middlewares/auth.middlewares.js";
import { refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage } from "../controllers/user.controllers.js";


const router = Router();

router.route("/register").post(upload.fields(
    [
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]
),registerUser);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

export default router;