import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET, AWS_S3_BASE_URL } from "../config.js";
import { randomUUID } from "crypto";

// Configurar cliente S3
let s3Client = null;

const getS3Client = () => {
  if (!s3Client) {
    // Validar que las credenciales estén configuradas
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error("Las credenciales de AWS S3 no están configuradas. Verifica las variables de entorno AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY");
    }

    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

/**
 * Sube una imagen a S3
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} mimeType - Tipo MIME del archivo (ej: image/jpeg)
 * @returns {Promise<string>} URL pública de la imagen subida
 */
export const uploadImageToS3 = async (fileBuffer, originalName, mimeType) => {
  try {
    // Validar que sea una imagen
    if (!mimeType.startsWith("image/")) {
      throw new Error("El archivo debe ser una imagen");
    }

    // Obtener cliente S3 (con validación de credenciales)
    const client = getS3Client();

    // Generar nombre único para el archivo
    const fileExtension = originalName.split(".").pop() || "jpg";
    const fileName = `${randomUUID()}.${fileExtension}`;
    const key = `portadas/${fileName}`;

    console.log(`[S3] Subiendo imagen: ${key} a bucket ${AWS_S3_BUCKET}`);

    // Configurar el comando de subida
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      // Nota: ACL puede estar deshabilitado en el bucket. Si es así, configurar la política del bucket para permitir acceso público
    });

    // Subir el archivo
    await client.send(command);

    // Retornar la URL pública
    const publicUrl = `${AWS_S3_BASE_URL}/${key}`;
    console.log(`[S3] Imagen subida exitosamente: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("[S3] Error subiendo imagen:", error);
    console.error("[S3] Detalles del error:", {
      name: error.name,
      message: error.message,
      code: error.Code || error.code,
      region: AWS_REGION,
      bucket: AWS_S3_BUCKET,
      hasCredentials: !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY),
    });
    throw new Error(`Error al subir la imagen: ${error.message}`);
  }
};

/**
 * Valida el tamaño y tipo de archivo
 * @param {Object} file - Objeto del archivo (multer)
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateImageFile = (file) => {
  // Validar tipo de archivo
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: "Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, WEBP, GIF",
    };
  }

  // Validar tamaño (máximo 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB en bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "La imagen es demasiado grande. El tamaño máximo es 5MB",
    };
  }

  return { valid: true };
};

