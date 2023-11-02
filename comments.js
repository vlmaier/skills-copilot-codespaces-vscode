// Create web server
import express from 'express';
import { json } from 'body-parser';
import cors from 'cors';
import { randomBytes } from 'crypto';
import { default as axios } from 'axios';

const app = express();
// Use middleware
app.use(json());
app.use(cors());

// Comments
const commentsByPostId = {};

// Get comments
app.get('/posts/:id/comments', (req, res) => {
  const { id } = req.params;
  const comments = commentsByPostId[id] || [];
  res.status(200).send(comments);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const commentId = randomBytes(4).toString('hex');
  const comments = commentsByPostId[id] || [];
  comments.push({ id: commentId, content, status: 'pending' });
  commentsByPostId[id] = comments;
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: id, status: 'pending' },
  });
  res.status(201).send(comments);
});

// Event bus
app.post('/events', async (req, res) => {
  const { type, data } = req.body;
  if (type === 'CommentModerated') {
    const { id, postId, status, content } = data;
    const comments = commentsByPostId[postId];
    const comment = comments.find((c) => c.id === id);
    comment.status = status;
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, postId, status, content },
    });
  }
  res.status(200).send({});
});

// Listen to port
app.listen(4001, () => {
  console.log('Listening on port 4001');
});