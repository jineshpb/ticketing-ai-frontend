import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Admin = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [editFormData, setEditFormData] = useState({ role: '', skills: '' })
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (!token) {
      navigate('/login')
      return
    }

    if (!storedUser) {
      navigate('/')
      return
    }

    try {
      const user = JSON.parse(storedUser)
      console.log('Admin check - User object:', user)
      console.log('Admin check - User role:', user?.role)
      
      if (!user || user.role !== 'admin') {
        console.log('Admin check failed - redirecting to home')
        navigate('/')
        return
      }

      fetchUsers()
    } catch (error) {
      console.error('Error parsing user from localStorage:', error)
      navigate('/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch users')
      }

      const data = await res.json()
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setError(error.message || 'Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (user) => {
    setEditingUser(user._id)
    setEditFormData({
      role: user.role || 'user',
      skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
    })
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setEditFormData({ role: '', skills: '' })
  }

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value })
  }

  const handleUpdateUser = async (userEmail) => {
    if (!editFormData.role) {
      alert('Role is required')
      return
    }

    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const skillsArray = editFormData.skills
        ? editFormData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : []

      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/update-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          role: editFormData.role,
          skills: skillsArray,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      await fetchUsers()
      setEditingUser(null)
      setEditFormData({ role: '', skills: '' })
      alert('User updated successfully!')
    } catch (error) {
      console.error('Error updating user:', error)
      alert(error.message || 'Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRoleBadgeClass = (role) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold'
    switch (role?.toLowerCase()) {
      case 'admin':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'moderator':
        return `${baseClasses} bg-purple-100 text-purple-800`
      case 'user':
        return `${baseClasses} bg-blue-100 text-blue-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-2 text-gray-600">Manage all users in the system</p>
          {!loading && (
            <p className="mt-1 text-sm text-gray-500">
              {users.length} {users.length === 1 ? 'user' : 'users'} found
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              aria-label="Retry fetching users"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-2 text-gray-500">There are no users in the system yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user._id ? (
                          <select
                            name="role"
                            value={editFormData.role}
                            onChange={handleEditChange}
                            disabled={submitting}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={getRoleBadgeClass(user.role)}>
                            {user.role || 'user'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingUser === user._id ? (
                          <input
                            type="text"
                            name="skills"
                            value={editFormData.skills}
                            onChange={handleEditChange}
                            placeholder="Enter skills separated by commas"
                            disabled={submitting}
                            className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        ) : (
                          <div className="text-sm text-gray-600">
                            {Array.isArray(user.skills) && user.skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.skills.map((skill, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">No skills</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingUser === user._id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateUser(user.email)}
                              disabled={submitting}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed text-xs"
                              aria-label={`Save changes for ${user.email}`}
                            >
                              {submitting ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={submitting}
                              className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-xs"
                              aria-label={`Cancel editing ${user.email}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(user)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors text-xs"
                            aria-label={`Edit user ${user.email}`}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Admin