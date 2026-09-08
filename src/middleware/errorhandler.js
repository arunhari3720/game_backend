const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 11000) {
    return res.status(400).json({ error: 'Duplicate value' });
  }

  res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;