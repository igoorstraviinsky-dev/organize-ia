import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "[Auth Middleware] SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados.",
  );
}

/**
 * Middleware para validar o JWT do Supabase e extrair o user_id.
 * Também cria um cliente Supabase autenticado para a requisição.
 */
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const xUserToken = req.headers["x-user-token"];

  const token =
    (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ||
    xUserToken;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Acesso negado: Token de autenticação ausente." });
  }

  try {
    // Usamos um cliente temporário com a service_role apenas para validar o token
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Sessão inválida ou expirada." });
    }

    // Identidade real do usuário (extraída do JWT)
    req.user = user;

    // Cliente Supabase específico para esta requisição (respeita RLS)
    req.sb = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    next();
  } catch (err) {
    console.error("[Auth Middleware Error]", err.message);
    res.status(500).json({ error: "Erro interno ao validar autenticação." });
  }
};
