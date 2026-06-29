/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types.js';
import { UserCheck, Shield, GraduationCap, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
}

export default function ProfileView({ user, onUpdate }: ProfileViewProps) {
  const [name, setName] = useState(user.name || '');
  const [institution, setInstitution] = useState(user.institution || '');
  const [role, setRole] = useState(user.role || 'Researcher');
  const [bio, setBio] = useState(user.bio || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name,
          institution,
          role,
          bio
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      setSuccess(true);
      onUpdate(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200/80 p-8 shadow-sm animate-fade-in">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-slate-800">Academic Profile</h2>
          <p className="text-xs text-slate-400">Configure your affiliation, credentials, and research focus.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {success && (
          <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-800 text-sm p-4 rounded-lg border border-emerald-100">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Profile settings updated and saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2.5 bg-rose-50 text-rose-800 text-sm p-4 rounded-lg border border-rose-100">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-lg p-3 text-sm font-mono cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Academic Affiliation</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Stanford University"
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Role / Credential Tier</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none transition-colors"
          >
            <option value="Researcher">Researcher / Independent Scholar</option>
            <option value="Postgraduate Student">Postgraduate / PhD Student</option>
            <option value="Academic Advisor">Academic Advisor / Faculty Mentor</option>
            <option value="Peer Reviewer">Journal Peer Reviewer</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Research Focus / Academic Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Briefly state your field of study or current research interests..."
            className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-6 py-3 rounded-lg transition-colors focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Saving Profile...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
