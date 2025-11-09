import { pool } from "../db.js";

// Listar productos con filtros opcionales
// Regla de negocio: disponibilidad visible = stock - stock_reserved
export const listarProductos = async (req, res) => {
  try {
    const { categoria, autor, precio_min, precio_max, ordenar, limite, offset } =
      req.query;

    let query = `SELECT id_producto, titulo, autor, categoria, precio, precio_promocional,
                 stock, stock_reserved, (stock - stock_reserved) as stock_disponible,
                 imagen_url, descripcion, fecha_creacion
                 FROM productos`;
    const params = [];
    let paramCount = 0;
    const whereConditions = [];

    // Filtros
    if (categoria) {
      paramCount++;
      whereConditions.push(`categoria = $${paramCount}`);
      params.push(categoria);
    }

    if (autor) {
      paramCount++;
      whereConditions.push(`autor ILIKE $${paramCount}`);
      params.push(`%${autor}%`);
    }

    if (precio_min) {
      paramCount++;
      whereConditions.push(`precio >= $${paramCount}`);
      params.push(precio_min);
    }

    if (precio_max) {
      paramCount++;
      whereConditions.push(`precio <= $${paramCount}`);
      params.push(precio_max);
    }

    // Todos los usuarios (autenticados y no autenticados) verán todos los productos
    // Los productos sin stock disponible se mostrarán grisados en el frontend

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    // Ordenamiento
    const ordenValido = ["precio_asc", "precio_desc", "titulo_asc", "titulo_desc"];
    if (ordenar && ordenValido.includes(ordenar)) {
      switch (ordenar) {
        case "precio_asc":
          query += " ORDER BY precio ASC";
          break;
        case "precio_desc":
          query += " ORDER BY precio DESC";
          break;
        case "titulo_asc":
          query += " ORDER BY titulo ASC";
          break;
        case "titulo_desc":
          query += " ORDER BY titulo DESC";
          break;
      }
    } else {
      query += " ORDER BY titulo ASC";
    }

    // Paginación
    if (limite) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limite));
    }

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    const resultado = await pool.query(query, params);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener productos" });
  }
};

// Obtener un producto por ID
// NOTA: No filtra por stock disponible aquí, ya que puede ser necesario obtener productos sin stock
// (ej: para verificar disponibilidad en órdenes, administración, etc.)
// El filtro de stock disponible se aplica solo en el catálogo público (listarProductos)
export const obtenerProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      `SELECT id_producto, titulo, autor, categoria, precio, precio_promocional,
       stock, stock_reserved, (stock - stock_reserved) as stock_disponible,
       imagen_url, descripcion, fecha_creacion
       FROM productos 
       WHERE id_producto = $1`,
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el producto" });
  }
};

// Buscar productos por título, autor o palabra clave
export const buscarProductos = async (req, res) => {
  try {
    const { q, categoria, autor, precio_min, precio_max, ordenar, limite, offset } =
      req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        message: "Debe proporcionar un término de búsqueda",
      });
    }

    const searchTerm = `%${q.trim()}%`;
    let query = `SELECT id_producto, titulo, autor, categoria, precio, precio_promocional,
       stock, stock_reserved, (stock - stock_reserved) as stock_disponible,
       imagen_url, descripcion, fecha_creacion
                 FROM productos`;
    const params = [];
    let paramCount = 0;
    const whereConditions = [];

    // Búsqueda por término (siempre presente)
    paramCount++;
    whereConditions.push(`(titulo ILIKE $${paramCount} OR autor ILIKE $${paramCount} OR categoria ILIKE $${paramCount})`);
    params.push(searchTerm);

    // Filtros adicionales
    if (categoria) {
      paramCount++;
      whereConditions.push(`categoria = $${paramCount}`);
      params.push(categoria);
    }

    if (autor) {
      paramCount++;
      whereConditions.push(`autor ILIKE $${paramCount}`);
      params.push(`%${autor}%`);
    }

    if (precio_min) {
      paramCount++;
      whereConditions.push(`precio >= $${paramCount}`);
      params.push(precio_min);
    }

    if (precio_max) {
      paramCount++;
      whereConditions.push(`precio <= $${paramCount}`);
      params.push(precio_max);
    }

    // Todos los usuarios ven todos los productos (incluso sin stock disponible)
    // Los productos sin stock disponible se mostrarán grisados en el frontend

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    // Ordenamiento
    const ordenValido = ["precio_asc", "precio_desc", "titulo_asc", "titulo_desc"];
    if (ordenar && ordenValido.includes(ordenar)) {
      switch (ordenar) {
        case "precio_asc":
          query += " ORDER BY precio ASC";
          break;
        case "precio_desc":
          query += " ORDER BY precio DESC";
          break;
        case "titulo_asc":
          query += " ORDER BY titulo ASC";
          break;
        case "titulo_desc":
          query += " ORDER BY titulo DESC";
          break;
      }
    } else {
      query += " ORDER BY titulo ASC";
    }

    // Paginación
    if (limite) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limite));
    }

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    const resultado = await pool.query(query, params);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al buscar productos" });
  }
};

// Listar productos novedades (más recientes)
export const listarNovedades = async (req, res) => {
  try {
    const { limite = 10 } = req.query;
    const limiteNum = parseInt(limite);

    if (isNaN(limiteNum) || limiteNum < 1 || limiteNum > 100) {
      return res.status(400).json({
        message: "El límite debe ser un número entre 1 y 100",
      });
    }

    // Todos los usuarios ven todos los productos (incluso sin stock disponible)
    // Los productos sin stock disponible se mostrarán grisados en el frontend
    const resultado = await pool.query(
      `SELECT id_producto, titulo, autor, categoria, precio, precio_promocional,
       stock, stock_reserved, (stock - stock_reserved) as stock_disponible,
       imagen_url, descripcion, fecha_creacion
       FROM productos 
       ORDER BY fecha_creacion DESC
       LIMIT $1`,
      [limiteNum]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener novedades" });
  }
};

// Obtener productos relacionados (misma categoría o mismo autor)
export const obtenerProductosRelacionados = async (req, res) => {
  try {
    const { id } = req.params;
    const { limite = 5 } = req.query;
    const limiteNum = parseInt(limite);

    if (isNaN(limiteNum) || limiteNum < 1 || limiteNum > 20) {
      return res.status(400).json({
        message: "El límite debe ser un número entre 1 y 20",
      });
    }

    // Primero obtener el producto actual para conocer su categoría y autor
    const productoActual = await pool.query(
      "SELECT categoria, autor FROM productos WHERE id_producto = $1",
      [id]
    );

    if (productoActual.rowCount === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const { categoria, autor } = productoActual.rows[0];

    // Buscar productos relacionados: misma categoría o mismo autor, excluyendo el producto actual
    const resultado = await pool.query(
      `SELECT id_producto, titulo, autor, categoria, precio, precio_promocional,
       stock, stock_reserved, (stock - stock_reserved) as stock_disponible,
       imagen_url, descripcion, fecha_creacion
       FROM productos 
       WHERE id_producto != $1
       AND (stock - stock_reserved) > 0
       AND (
         (categoria IS NOT NULL AND categoria = $2) OR 
         (autor = $3)
       )
       ORDER BY 
         CASE 
           WHEN categoria = $2 AND autor = $3 THEN 1  -- Misma categoría Y mismo autor (más relevante)
           WHEN categoria = $2 THEN 2                  -- Misma categoría
           WHEN autor = $3 THEN 3                       -- Mismo autor
         END,
         fecha_creacion DESC
       LIMIT $4`,
      [id, categoria, autor, limiteNum]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener productos relacionados" });
  }
};

// Listar productos en promoción (con precio_promocional)
export const listarPromociones = async (req, res) => {
  try {
    const { limite = 10 } = req.query;
    const limiteNum = parseInt(limite);

    if (isNaN(limiteNum) || limiteNum < 1 || limiteNum > 100) {
      return res.status(400).json({
        message: "El límite debe ser un número entre 1 y 100",
      });
    }

    // Todos los usuarios ven todos los productos (incluso sin stock disponible)
    // Los productos sin stock disponible se mostrarán grisados en el frontend
    const resultado = await pool.query(
      `SELECT id_producto, titulo, autor, categoria, precio, precio_promocional,
       stock, stock_reserved, (stock - stock_reserved) as stock_disponible,
       imagen_url, descripcion, fecha_creacion
       FROM productos 
       WHERE precio_promocional IS NOT NULL
       AND precio_promocional < precio
       ORDER BY (precio - precio_promocional) DESC, fecha_creacion DESC
       LIMIT $1`,
      [limiteNum]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener promociones" });
  }
};

// Obtener todas las categorías únicas disponibles
export const listarCategorias = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT DISTINCT categoria 
       FROM productos 
       WHERE categoria IS NOT NULL AND categoria != ''
       ORDER BY categoria ASC`
    );

    const categorias = resultado.rows.map(row => row.categoria);
    res.json(categorias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener categorías" });
  }
};

