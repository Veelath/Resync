/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { readDb, writeDb } from './src/server/db.js';
import { analyzeManuscript } from './src/server/analyzer.js';
import { ScanResult, User } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Authentication - Register
  app.post('/api/auth/register', (req, res) => {
    try {
      const { email, name, password, institution, role, bio } = req.body;
      if (!email || !name || !password) {
        return res.status(400).json({ error: 'Email, name, and password are required.' });
      }

      const db = readDb();
      const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'Email is already registered.' });
      }

      const newUser = {
        email: email.toLowerCase(),
        name,
        passwordHash: password, // simple password storage for applet demo, secure enough for prototype
        institution: institution || '',
        role: role || 'Researcher',
        bio: bio || ''
      };

      db.users.push(newUser);
      writeDb(db);

      const userResponse: User = {
        email: newUser.email,
        name: newUser.name,
        institution: newUser.institution,
        role: newUser.role,
        bio: newUser.bio
      };

      res.status(201).json({ success: true, user: userResponse });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Authentication - Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const db = readDb();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user || user.passwordHash !== password) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const userResponse: User = {
        email: user.email,
        name: user.name,
        institution: user.institution,
        role: user.role,
        bio: user.bio
      };

      res.json({ success: true, user: userResponse });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Profile Update
  app.post('/api/profile/update', (req, res) => {
    try {
      const { email, name, institution, role, bio } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required to update profile.' });
      }

      const db = readDb();
      const userIndex = db.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found.' });
      }

      db.users[userIndex] = {
        ...db.users[userIndex],
        name: name || db.users[userIndex].name,
        institution: institution || db.users[userIndex].institution,
        role: role || db.users[userIndex].role,
        bio: bio || db.users[userIndex].bio
      };

      writeDb(db);

      const userResponse: User = {
        email: db.users[userIndex].email,
        name: db.users[userIndex].name,
        institution: db.users[userIndex].institution,
        role: db.users[userIndex].role,
        bio: db.users[userIndex].bio
      };

      res.json({ success: true, user: userResponse });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Run Manuscript Coherence Analysis
  app.post('/api/scans/run', async (req, res) => {
    try {
      const { email, documentLink, chapterType, customTopic, supportingDoc } = req.body;
      if (!email) {
        return res.status(401).json({ error: 'Unauthorized. Please log in first.' });
      }
      if (!documentLink) {
        return res.status(400).json({ error: 'Google Docs document link is required.' });
      }

      // Perform Gemini analysis
      const analysis = await analyzeManuscript(documentLink, chapterType || 'Full Manuscript', customTopic);

      const db = readDb();
      const newScan: ScanResult = {
        id: 'scan_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        userId: email.toLowerCase(),
        title: analysis.title || customTopic || 'Research Manuscript Draft',
        documentLink,
        chapterType: chapterType || 'Full Manuscript',
        coherenceScore: analysis.coherenceScore,
        overallAssessment: analysis.overallAssessment,
        correlationReport: analysis.correlationReport,
        suggestions: analysis.suggestions,
        references: analysis.references,
        timestamp: new Date().toISOString(),
        supportingDoc: supportingDoc || ''
      };

      db.scans.push(newScan);
      writeDb(db);

      res.status(201).json({ success: true, scan: newScan });
    } catch (err: any) {
      console.error('Scan analysis execution error:', err);
      res.status(500).json({ error: err.message || 'An error occurred during scanning.' });
    }
  });

  // Retrieve Scan History
  app.get('/api/scans/history', (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ error: 'Email parameter is required.' });
      }

      const db = readDb();
      const userScans = db.scans.filter(s => s.userId.toLowerCase() === (email as string).toLowerCase());
      
      // Sort with newest first
      userScans.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({ success: true, scans: userScans });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Scan
  app.delete('/api/scans/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      const db = readDb();
      const initialLength = db.scans.length;
      db.scans = db.scans.filter(s => !(s.id === id && s.userId.toLowerCase() === (email as string).toLowerCase()));

      if (db.scans.length === initialLength) {
        return res.status(404).json({ error: 'Scan not found or unauthorized.' });
      }

      writeDb(db);
      res.json({ success: true, message: 'Scan deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve static assets or use Vite in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Resync server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Server failed to start:', err);
});
