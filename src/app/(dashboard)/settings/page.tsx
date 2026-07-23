'use client';

import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { Camera, Save, Lock } from 'lucide-react';
import Link from 'next/link';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();
  const { data: storage } = trpc.user.getStorageDetails.useQuery();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast('Profile updated', 'success');
      utils.user.getProfile.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const uploadAvatar = trpc.user.uploadAvatar.useMutation({
    onSuccess: () => {
      toast('Avatar updated', 'success');
      utils.user.getProfile.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (!profile) return null;

  if (!loaded && profile) {
    setName(profile.name);
    setEmail(profile.email);
    setLoaded(true);
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, create a data URL as placeholder
    // In production, upload to S3
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        uploadAvatar.mutate({ avatarUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const usedPercent = storage ? Math.min((storage.used / storage.capacityBytes) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Profile</h2>
            <Link
              href="/settings/password"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Lock className="h-4 w-4" />
              Change Password
            </Link>
          </div>

          {/* Avatar */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-200">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-500">
                    {profile.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-1.5 text-white hover:bg-blue-700"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => updateProfile.mutate({ name, email })}
              disabled={updateProfile.isPending || (name === profile.name && email === profile.email)}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Storage Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Storage</h2>

          {storage && (
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-600">{formatBytes(storage.used)} used</span>
                  <span className="text-gray-600">{storage.capacity} GB</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2.5 rounded-full ${
                      usedPercent > 90 ? 'bg-red-500' : usedPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">By Type</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Images</span>
                    <span className="text-gray-700">{formatBytes(storage.breakdown.images ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Documents</span>
                    <span className="text-gray-700">{formatBytes(storage.breakdown.documents ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Videos</span>
                    <span className="text-gray-700">{formatBytes(storage.breakdown.videos ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Other</span>
                    <span className="text-gray-700">{formatBytes(storage.breakdown.other ?? 0)}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">{storage.fileCount} files total</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
