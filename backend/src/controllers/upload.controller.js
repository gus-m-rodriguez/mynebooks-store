import multer from "multer";
import { uploadImageToS3, validateImageFile } from "../utils/s3.js";

// Configurar multer para almacenar en memoria (no en disco)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
});

// Middleware para manejar un solo archivo
export const uploadSingle = upload.single("image");

// Middleware para manejar errores de multer
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "El archivo es demasiado grande. El tamaño máximo es 5MB",
      });
    }
    return res.status(400).json({
      message: `Error al procesar el archivo: ${err.message}`,
    });
  }
  if (err) {
    return res.status(400).json({
      message: err.message || "Error al procesar el archivo",
    });
  }
  next();
};

/**
 * Sube una imagen a S3
 * POST /api/admin/upload/image
 */
export const uploadImage = async (req, res) => {
  try {
    console.log("[Upload] Iniciando subida de imagen...");
    console.log("[Upload] req.file:", req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : "No hay archivo");

    if (!req.file) {
      console.error("[Upload] No se proporcionó ningún archivo");
      return res.status(400).json({
        message: "No se proporcionó ningún archivo",
      });
    }

    // Validar el archivo
    const validation = validateImageFile(req.file);
    if (!validation.valid) {
      console.error("[Upload] Validación fallida:", validation.error);
      return res.status(400).json({
        message: validation.error,
      });
    }

    console.log("[Upload] Archivo validado, subiendo a S3...");

    // Subir a S3
    const imageUrl = await uploadImageToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    console.log("[Upload] Imagen subida exitosamente:", imageUrl);

    return res.json({
      message: "Imagen subida exitosamente",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error("[Upload] Error subiendo imagen:", error);
    console.error("[Upload] Stack:", error.stack);
    return res.status(500).json({
      message: error.message || "Error al subir la imagen",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

