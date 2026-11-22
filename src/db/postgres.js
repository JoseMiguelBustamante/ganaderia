import pg from 'pg';
import { env } from '../config/env.js';

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export const executeQuery = async (text, params = []) => {
    const result = await pool.query(text, params);
    return result.rows;
};

export const executeStoreProcedure = async (name, params = []) => {
    const placeholders = params.map((_, index) => `$${index + 1}`).join(', ');
    const result = await pool.query(`CALL ${name}(${placeholders})`, params);
    return result.rows;
};
