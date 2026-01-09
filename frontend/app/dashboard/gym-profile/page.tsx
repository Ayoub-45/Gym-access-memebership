'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl, API_URL } from "../../lib/api";

interface GymProfile {
  id: number;
  name: string;
  logo: string | null;
  address: string | null;
  subscription_status: string;
  created_at: string;
}

export default function GymProfilePage() {
  const router = useRouter();
  const [gym, setGym] = useState<GymProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });

  // Fetch gym profile
  useEffect(() => {
    const fetchGymProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(apiUrl("/api/gym/profile"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success) {
          setGym(data.gym);
          setFormData({
            name: data.gym.name || '',
            address: data.gym.address || '',
          });
          if (data.gym.logo) {
            setLogoPreview(`${API_URL}/uploads/${data.gym.logo.split('/').pop()}`);
          }
        } else {
          setError(data.error || 'Failed to load gym profile');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Server error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGymProfile();
  }, [router]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const token = localStorage.getItem('token');

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('address', formData.address || '');
      if (logoFile) {
        submitData.append('logo', logoFile);
      }

      const response = await fetch(apiUrl("/api/gym/profile"), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: submitData,
      });

      const data = await response.json();

      if (data.success) {
        setGym(data.gym);
              if (data.gym.logo) {
          setLogoPreview(`${API_URL}/uploads/${data.gym.logo.split('/').pop()}`);
        } else {
          setLogoPreview(null);
        }
        setSuccess('Gym profile updated successfully!');

        // Update localStorage
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          user.gymName = data.gym.name;
          user.gymLogo = data.gym.logo;
          localStorage.setItem('user', JSON.stringify(user));
        }

        setLogoFile(null);
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setError(data.error || 'Update failed');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Server error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Gym Profile</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Success Alert */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Gym Information</h2>
              <p className="text-sm text-gray-500">Manage your gym's profile and details</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Gym Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Gym Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                placeholder="Fitness Pro Gym"
              />
              <p className="mt-1 text-xs text-gray-500">This name will be displayed to your members</p>
            </div>

            {/* Logo Image Upload */}
            <div className="space-y-3">
              <label htmlFor="logo-file" className="block text-sm font-semibold text-gray-700 mb-2">
                Logo Image (Optionnel)
              </label>
              
              {/* Custom File Input */}
              <div className="relative">
                <input
                  id="logo-file"
                  name="logo"
                  type="file"
                  accept="image/*"
                  className="sr-only"  // Caché
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoFile(file);
                      setLogoPreview(URL.createObjectURL(file));
                    } else {
                      setLogoFile(null);
                      setLogoPreview(null);
                    }
                  }}
                />
                <label 
                  htmlFor="logo-file" 
                  className="block w-full px-4 py-3 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center text-sm text-gray-600"
                >
                  {logoFile ? (
                    <span className="font-medium text-indigo-700">
                      ✅ {logoFile.name} selected
                    </span>
                  ) : (
                    <span>📎 Choose File (No file chosen)</span>
                  )}
                </label>
              </div>
              
              {logoPreview && (
                <div className="mt-2">
                  <img src={logoPreview} alt="Logo Preview" className="max-w-xs max-h-32 object-contain rounded-lg border shadow-sm" />
                </div>
              )}
              <p className="text-xs text-gray-500">Upload an image for the logo (max 5MB)</p>
            </div>


            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                Address (Optional)
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                placeholder="123 Main St, City, State 12345"
              />
              <p className="mt-1 text-xs text-gray-500">Your gym's physical location</p>
            </div>

            {/* Subscription Status (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subscription Status
              </label>
              <div className="flex items-center px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  gym?.subscription_status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : gym?.subscription_status === 'trial'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {gym?.subscription_status || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Gym ID (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gym ID
              </label>
              <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-600 font-mono">
                {gym?.id}
              </div>
              <p className="mt-1 text-xs text-gray-500">This is your unique gym identifier</p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Info Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-blue-700">
              Your gym profile is visible to all members. Make sure to keep it up to date with accurate information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}