import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetUsersQuery, useUpdateUserStatusMutation } from '../../store/api/usersApi';

const UserList = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);
  const userRole = currentUser?.role;
  const shouldFetchUsers = userRole === 'admin';
  const { data: users, isLoading, error, refetch } = useGetUsersQuery(undefined, {
    skip: !shouldFetchUsers,
  });
  const [updateUserStatus] = useUpdateUserStatusMutation();

  console.log('UserList Debug:', { 
    currentUser,
    users, 
    isLoading, 
    error, 
    userRole, 
    shouldFetchUsers 
  });

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access this page.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized Access</h2>
          <p className="text-gray-600 mb-2">You do not have permission to view this page.</p>
          <p className="text-sm text-gray-500 mb-4">
            Current Role: <span className="font-semibold">{userRole}</span> | Required: <span className="font-semibold">admin</span>
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleToggleStatus = async (user) => {
    const action = user.isActive ? 'disable' : 'enable';
    const confirmMessage = `Are you sure you want to ${action} ${user.name}?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await updateUserStatus(user.id).unwrap();
      } catch (err) {
        alert(`Failed to ${action} user: ${err.data?.message || err.message}`);
      }
    }
  };

  const getRoleBadgeClass = (role) => {
    const baseClass = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (role?.toLowerCase()) {
      case 'admin':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'manager':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'employee':
        return `${baseClass} bg-gray-100 text-gray-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusBadgeClass = (isActive) => {
    const baseClass = "px-2 py-1 text-xs font-semibold rounded-full";
    return isActive
      ? `${baseClass} bg-green-100 text-green-800`
      : `${baseClass} bg-gray-100 text-gray-800`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Users API Error:', error);
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Users</h3>
          <p className="text-red-600 mb-4">{error.data?.message || error.message || 'Failed to fetch users'}</p>
          {error.status && <p className="text-sm text-red-500">Status: {error.status}</p>}
          <button
            onClick={() => refetch()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">
            Manage system users and roles
            {users && <span className="ml-2 text-sm">({users.length} {users.length === 1 ? 'user' : 'users'})</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => navigate('/users/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Add User
          </button>
        </div>
      </div>

      {!users || users.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-12 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Users Found</h3>
          <p className="text-gray-600 mb-2">There are currently no users in the system.</p>
          <p className="text-sm text-gray-500 mb-6">
            Users created through registration will appear here. You can also manually add users.
          </p>
          <div className="text-xs text-gray-400 mb-4 font-mono bg-gray-100 p-2 rounded">
            API Response: {JSON.stringify(users)}
          </div>
          <button
            onClick={() => navigate('/users/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Add User
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getRoleBadgeClass(user.role)}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(user.isActive)}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => navigate(`/users/${user.id}/edit`)}
                      className="text-blue-600 hover:text-blue-900 font-medium mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`font-medium ${
                        user.isActive
                          ? 'text-red-600 hover:text-red-900'
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {user.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserList;
