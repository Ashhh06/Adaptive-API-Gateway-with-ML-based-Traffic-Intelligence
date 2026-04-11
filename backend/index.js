const express = require('express');

const app = express();

app.use(express.json());

app.get('/api', (req, res) => {
    res.json({ message: 'Backend OK', status: 'ok' });
});
app.get('/api/', (req, res) => {
    res.json({ message: 'Backend OK', status: 'ok' });
});

app.get('/', (req, res) => {
    res.json({ message: 'Backend root', try: ['/api', '/api/', '/users', '/slow', '/error'] });
});

app.get('/users', (req, res) => {
    res.json({
        message: 'Users fetched successfully',
        data: ['user1', 'user2', 'user3']
    });
});

app.get('/slow', (req, res) => {
    setTimeout(() => {
        res.json({
            message: 'Slow response'
        });
    }, 3000);
});

app.get('/error', (req, res) => {
    res.status(500).json({ error : 'Backend error' });
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Backend is running on port ${PORT}`);
});
