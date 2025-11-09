import Router from "express-promise-router";
import {
  signin,
  signup,
  signout,
  profile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { eliminarMiCuenta } from "../controllers/usuarios.controller.js";
import { isAuth } from "../middlewares/auth.middleware.js";
import { validateSchema } from "../middlewares/validate.middleware.js";
import { signupSchema, signinSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/signin", validateSchema(signinSchema), signin);
router.post("/signup", validateSchema(signupSchema), signup);
router.post("/signout", signout);

// Restablecimiento de contraseña (públicos)
router.post("/forgot-password", validateSchema(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validateSchema(resetPasswordSchema), resetPassword);

router.get("/profile", isAuth, profile);
router.put("/profile", isAuth, updateProfile);
router.put("/profile/password", isAuth, changePassword);
router.delete("/profile", isAuth, eliminarMiCuenta); // Eliminar cuenta propia

export default router;

