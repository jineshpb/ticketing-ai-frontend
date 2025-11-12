import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Users, Loader2, Save, X, Edit } from "lucide-react";

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

  const handleRoleChange = (value) => {
    setEditFormData({ ...editFormData, role: value })
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
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'moderator':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'user':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="mt-2 text-muted-foreground">Manage all users in the system</p>
          {!loading && (
            <p className="mt-1 text-sm text-muted-foreground">
              {users.length} {users.length === 1 ? 'user' : 'users'} found
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                onClick={fetchUsers}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Loading users...</p>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="mx-auto h-16 w-16 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No users found</h3>
              <p className="mt-2 text-muted-foreground">There are no users in the system yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        {editingUser === user._id ? (
                          <Select
                            value={editFormData.role}
                            onValueChange={handleRoleChange}
                            disabled={submitting}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getRoleBadgeClass(user.role)}>
                            {user.role || 'user'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUser === user._id ? (
                          <Input
                            type="text"
                            name="skills"
                            value={editFormData.skills}
                            onChange={handleEditChange}
                            placeholder="Enter skills separated by commas"
                            disabled={submitting}
                            className="w-full"
                          />
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {Array.isArray(user.skills) && user.skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.skills.map((skill, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No skills</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        {editingUser === user._id ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleUpdateUser(user.email)}
                              disabled={submitting}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-3 w-3" />
                                  Save
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              disabled={submitting}
                              size="sm"
                              variant="outline"
                            >
                              <X className="mr-2 h-3 w-3" />
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleEditClick(user)}
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="mr-2 h-3 w-3" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Admin
