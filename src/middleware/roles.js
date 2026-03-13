const roles = {
  agent: ['agent', 'manager', 'admin'],
  manager: ['manager', 'admin'],
  admin: ['admin']
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const userRole = req.user.role;
    const hasAccess = allowedRoles.some(role => roles[role]?.includes(userRole));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    next();
  };
};

module.exports = authorize;