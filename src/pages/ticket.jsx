import React, { useEffect, useState } from 'react'

function TicketDetailsPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);

  const token = localStorage.getItem('token');

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/ticket`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      console.error(error);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleChange = async (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/ticket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setTickets([...tickets, data]);
      setForm({ title: '', description: '' });
    } catch (error) {
      alert(error.message || "Failed to create ticket");
      console.error(error);
    }
    finally {
      setLoading(false);
    }
  };
 
  return (
    <>
    <div className='flex flex-col gap-4'>
      <h1>Tickets</h1>
      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <input type="text" name="title" placeholder="Title" value={form.title} onChange={handleChange} className='input input-bordered ' />
        <input type="text" name="description" placeholder="Description" value={form.description} onChange={handleChange} className='input input-bordered ' />
        <button type="submit" disabled={loading} className='btn btn-primary w-auto'>Create Ticket</button>
      </form>
    </div>
    <div className='flex flex-col gap-4' style={{ width: '50%' }}>
      <h1>Tickets</h1>
      <ul>
        {tickets.map((ticket) => (
          <li key={ticket._id}>{ticket.title}</li>
        ))}
      </ul>
    </div>
    </>
  )
}

export default TicketDetailsPage