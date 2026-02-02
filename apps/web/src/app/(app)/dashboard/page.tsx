'use client';

import { useAuth } from '@/app/providers/auth-provider';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Display Name</label>
              <p className="text-lg text-gray-900">{user.displayName}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Phone Number</label>
              <p className="text-lg text-gray-900">{user.phoneNumber}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Timezone</label>
              <p className="text-lg text-gray-900">{user.timezone}</p>
            </div>

            {user.profilePhotoUrl && (
              <div>
                <label className="text-sm font-medium text-gray-500">Profile Photo</label>
                <img
                  src={user.profilePhotoUrl}
                  alt="Profile"
                  className="mt-2 w-20 h-20 rounded-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={logout}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
