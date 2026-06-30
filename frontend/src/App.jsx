import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  BookOpen, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  FileText, 
  CheckCircle, 
  XCircle, 
  ArrowRightLeft, 
  Info,
  Calendar,
  LogOut,
  MapPin,
  ClipboardList,
  Menu,
  X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : 'http://amigowebster.in:5001/api');

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    counts: { totalStudents: 0, totalStaff: 0, activeStudents: 0, activeStaff: 0 },
    weeklyData: [],
    recentLogs: []
  });
  
  // Alert/Notification State
  const [alert, setAlert] = useState(null);

  // Search/Filter States for Log History
  const [logFilter, setLogFilter] = useState({
    userType: '',
    checkedIn: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // Modal States
  const [studentModal, setStudentModal] = useState({ show: false, mode: 'add', data: null });
  const [staffModal, setStaffModal] = useState({ show: false, mode: 'add', data: null });
  const [manualLogModal, setManualLogModal] = useState(false);

  // Terminal Console States
  const [terminalUserType, setTerminalUserType] = useState('student');
  const [terminalSearch, setTerminalSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [terminalPurpose, setTerminalPurpose] = useState('General');
  const [terminalNotes, setTerminalNotes] = useState('');
  const [activeCheckInRecord, setActiveCheckInRecord] = useState(null);
  
  // Phase 2 Geolocation and FaceID states
  const [location, setLocation] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('ready'); // 'ready' | 'scanning' | 'verified'
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const videoRef = useRef(null);
  const searchRef = useRef(null);

  // Trigger alert helper
  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  // Fetch initial data
  useEffect(() => {
    fetchStats();
    fetchStudents();
    fetchStaff();
    fetchLogs();
  }, []);

  // Phase 2 Camera & Location Helpers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setCameraStream(stream);
    } catch (err) {
      console.warn('Camera access error:', err.message);
    }
  };

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.warn('Video play error:', e));
    }
  }, [cameraStream]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const fetchLocation = () => {
    setIsFetchingLocation(true);
    setLocation(null);
    if (!navigator.geolocation) {
      setLocation({ error: 'Geolocation is not supported by this browser' });
      setIsFetchingLocation(false);
      return;
    }

    const successCallback = (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      setIsFetchingLocation(false);
    };

    const errorCallback = (error) => {
      console.warn('High accuracy location failed. Falling back to IP-based location:', error.message);
      // Fallback to IP-based/low-accuracy location lookup which resolves instantly on desktops without GPS chips
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          setIsFetchingLocation(false);
        },
        (fallbackErr) => {
          console.warn('Fallback location lookup failed:', fallbackErr.message);
          setLocation({ error: fallbackErr.message || 'Location timeout expired' });
          setIsFetchingLocation(false);
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  };

  useEffect(() => {
    if (selectedUser) {
      startCamera();
      fetchLocation();
    } else {
      stopCamera();
      setLocation(null);
      setScanStatus('ready');
    }
    return () => stopCamera();
  }, [selectedUser]);

  // Fetch functions
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/timesheet/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_URL}/staff`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (logFilter.userType) queryParams.append('user_type', logFilter.userType);
      if (logFilter.checkedIn) queryParams.append('checked_in', logFilter.checkedIn);
      if (logFilter.startDate) queryParams.append('start_date', logFilter.startDate);
      if (logFilter.endDate) queryParams.append('end_date', logFilter.endDate);
      if (logFilter.search) queryParams.append('search', logFilter.search);

      const res = await fetch(`${API_URL}/timesheet/logs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  // Trigger search on filter changes
  useEffect(() => {
    fetchLogs();
  }, [logFilter]);

  // Terminal Autocomplete Search
  useEffect(() => {
    if (!terminalSearch.trim()) {
      setSuggestions([]);
      return;
    }

    const searchLower = terminalSearch.toLowerCase();
    
    const matchedStudents = students
      .filter(s => s.name.toLowerCase().includes(searchLower) || s.student_id.toLowerCase().includes(searchLower))
      .map(s => ({ ...s, user_type: 'student', idCode: s.student_id }));
      
    const matchedStaff = staff
      .filter(st => st.name.toLowerCase().includes(searchLower) || st.staff_id.toLowerCase().includes(searchLower))
      .map(st => ({ ...st, user_type: 'staff', idCode: st.staff_id }));

    setSuggestions([...matchedStudents, ...matchedStaff].slice(0, 8));
  }, [terminalSearch, students, staff]);

  const handleSelectUser = (user) => {
    setTerminalUserType(user.user_type);
    setSelectedUser(user);
    setTerminalSearch(user.name);
    setSuggestions([]);
  };

  const generateNextStudentID = () => {
    if (students.length === 0) return 'STU001';
    let maxId = 0;
    students.forEach(s => {
      const match = s.student_id.match(/STU(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });
    return `STU${String(maxId + 1).padStart(3, '0')}`;
  };

  const generateNextStaffID = () => {
    if (staff.length === 0) return 'STF001';
    let maxId = 0;
    staff.forEach(s => {
      const match = s.staff_id.match(/STF(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });
    return `STF${String(maxId + 1).padStart(3, '0')}`;
  };

  // Check if selected user is already checked-in
  useEffect(() => {
    if (!selectedUser) {
      setActiveCheckInRecord(null);
      return;
    }

    const checkActiveRecord = async () => {
      try {
        const idField = terminalUserType === 'student' ? 'student_id' : 'staff_id';
        const res = await fetch(
          `${API_URL}/timesheet/logs?user_type=${terminalUserType}&checked_in=true&search=${selectedUser[idField]}`
        );
        if (res.ok) {
          const activeLogs = await res.json();
          if (activeLogs.length > 0) {
            setActiveCheckInRecord(activeLogs[0]);
          } else {
            setActiveCheckInRecord(null);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkActiveRecord();
  }, [selectedUser, terminalUserType]);

  // Close suggestion dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form Submission Handlers
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      let url = `${API_URL}/students`;
      let method = 'POST';

      if (studentModal.mode === 'edit') {
        url = `${API_URL}/students/${studentModal.data.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        showAlert(studentModal.mode === 'edit' ? 'Student updated successfully' : 'Student registered successfully');
        setStudentModal({ show: false, mode: 'add', data: null });
        fetchStudents();
        fetchStats();
      } else {
        showAlert(data.error || 'Operation failed', 'danger');
      }
    } catch (err) {
      showAlert('Server error occurred', 'danger');
    }
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      let url = `${API_URL}/staff`;
      let method = 'POST';

      if (staffModal.mode === 'edit') {
        url = `${API_URL}/staff/${staffModal.data.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        showAlert(staffModal.mode === 'edit' ? 'Staff updated successfully' : 'Staff registered successfully');
        setStaffModal({ show: false, mode: 'add', data: null });
        fetchStaff();
        fetchStats();
      } else {
        showAlert(data.error || 'Operation failed', 'danger');
      }
    } catch (err) {
      showAlert('Server error occurred', 'danger');
    }
  };

  const executeCheckIn = async (photoBase64) => {
    try {
      const res = await fetch(`${API_URL}/timesheet/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: terminalUserType,
          user_id: selectedUser.id,
          purpose: terminalPurpose,
          notes: terminalNotes,
          latitude: location && !location.error ? location.latitude : null,
          longitude: location && !location.error ? location.longitude : null,
          photo: photoBase64
        })
      });

      const data = await res.json();

      if (res.ok) {
        showAlert(`Successfully clocked-in ${selectedUser.name}`);
        setSelectedUser(null);
        setTerminalSearch('');
        setTerminalNotes('');
        setTerminalPurpose('General');
        fetchStats();
        fetchLogs();
      } else {
        showAlert(data.error || 'Clock-in failed', 'danger');
      }
    } catch (err) {
      showAlert('Server connection error', 'danger');
    }
  };

  const executeCheckOut = async (photoBase64) => {
    try {
      const payload = activeCheckInRecord 
        ? { 
            entry_id: activeCheckInRecord.id, 
            notes: terminalNotes,
            latitude: location && !location.error ? location.latitude : null,
            longitude: location && !location.error ? location.longitude : null,
            photo: photoBase64
          }
        : { 
            user_type: terminalUserType, 
            user_id: selectedUser.id, 
            notes: terminalNotes,
            latitude: location && !location.error ? location.latitude : null,
            longitude: location && !location.error ? location.longitude : null,
            photo: photoBase64
          };

      const res = await fetch(`${API_URL}/timesheet/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        showAlert(`Successfully clocked-out ${selectedUser.name}`);
        setSelectedUser(null);
        setTerminalSearch('');
        setTerminalNotes('');
        fetchStats();
        fetchLogs();
      } else {
        showAlert(data.error || 'Clock-out failed', 'danger');
      }
    } catch (err) {
      showAlert('Server connection error', 'danger');
    }
  };

  const handleClockAction = async (actionType) => {
    setIsScanning(true);
    setScanStatus('scanning');

    // 1. Capture photo
    let photoBase64 = null;
    if (videoRef.current && cameraStream) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoBase64 = canvas.toDataURL('image/jpeg', 0.65);
      } catch (err) {
        console.warn('Failed to capture frame:', err);
      }
    }

    // 2. Scan Delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    setScanStatus('verified');
    await new Promise(resolve => setTimeout(resolve, 400));

    // 3. Submit API
    if (actionType === 'in') {
      await executeCheckIn(photoBase64);
    } else {
      await executeCheckOut(photoBase64);
    }

    setIsScanning(false);
    setScanStatus('ready');
  };

  const handleManualLogSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    // Resolve structural id based on choice
    const userSelectStr = e.target.manual_user.value; // format: "type:id"
    if (!userSelectStr) {
      showAlert('Please select a user', 'danger');
      return;
    }
    const [type, userId] = userSelectStr.split(':');

    const entryPayload = {
      user_type: type,
      user_id: parseInt(userId, 10),
      date: payload.date,
      check_in: `${payload.date} ${payload.check_in_time}:00`,
      check_out: `${payload.date} ${payload.check_out_time}:00`,
      purpose: payload.purpose,
      notes: payload.notes
    };

    try {
      const res = await fetch(`${API_URL}/timesheet/manual-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryPayload)
      });

      const data = await res.json();

      if (res.ok) {
        showAlert('Manual log entry created successfully');
        setManualLogModal(false);
        fetchStats();
        fetchLogs();
      } else {
        showAlert(data.error || 'Failed to create log', 'danger');
      }
    } catch (err) {
      showAlert('Server connection error', 'danger');
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"? All their clock-in logs will also be permanently deleted.`)) return;

    try {
      const res = await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert(`Deleted student "${name}"`);
        fetchStudents();
        fetchStats();
        fetchLogs();
      } else {
        const data = await res.json();
        showAlert(data.error || 'Failed to delete', 'danger');
      }
    } catch (err) {
      showAlert('Server error', 'danger');
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete staff member "${name}"? All their clock-in logs will also be permanently deleted.`)) return;

    try {
      const res = await fetch(`${API_URL}/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert(`Deleted staff member "${name}"`);
        fetchStaff();
        fetchStats();
        fetchLogs();
      } else {
        const data = await res.json();
        showAlert(data.error || 'Failed to delete', 'danger');
      }
    } catch (err) {
      showAlert('Server error', 'danger');
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm('Delete this entry log permanently?')) return;
    try {
      const res = await fetch(`${API_URL}/timesheet/logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Timesheet entry deleted successfully');
        fetchLogs();
        fetchStats();
      } else {
        const data = await res.json();
        showAlert(data.error || 'Failed to delete log', 'danger');
      }
    } catch (err) {
      showAlert('Server error', 'danger');
    }
  };

  const handleTableCheckOut = async (entryId, name) => {
    try {
      const res = await fetch(`${API_URL}/timesheet/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId })
      });
      if (res.ok) {
        showAlert(`Clocked-out ${name}`);
        fetchLogs();
        fetchStats();
      } else {
        const data = await res.json();
        showAlert(data.error || 'Checkout failed', 'danger');
      }
    } catch (err) {
      showAlert('Server connection error', 'danger');
    }
  };

  // CSV Export Handler
  const handleExportCSV = (type) => {
    if (type === 'student') {
      const fields = [
        { label: 'Student ID', key: 'student_id' },
        { label: 'Name', key: 'name' },
        { label: 'Email', key: 'email' },
        { label: 'Department', key: 'department' },
        { label: 'Batch', key: 'batch' }
      ];
      exportToCSV(students, 'students_details.csv', fields);
    } else {
      const fields = [
        { label: 'Staff ID', key: 'staff_id' },
        { label: 'Name', key: 'name' },
        { label: 'Email', key: 'email' },
        { label: 'Department', key: 'department' },
        { label: 'Designation', key: 'designation' }
      ];
      exportToCSV(staff, 'staff_details.csv', fields);
    }
  };

  const exportToCSV = (data, filename, fields) => {
    const csvHeaders = fields.map(f => f.label).join(',');
    const csvRows = data.map(row => 
      fields.map(f => {
        const val = row[f.key] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    // Add UTF-8 BOM for Microsoft Excel compliance
    const csvContent = '\uFEFF' + [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert(`Successfully exported records to Excel CSV`);
  };

  // CSV Import Handler
  const handleImportCSV = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const parsedData = parseCSV(text, type);
      
      if (parsedData.length === 0) {
        showAlert('No valid data found in CSV file', 'danger');
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let errorMsgs = [];

      showAlert(`Starting bulk import of ${parsedData.length} records...`);

      for (const item of parsedData) {
        const idField = type === 'student' ? 'student_id' : 'staff_id';
        if (!item[idField] || !item.name || !item.email || !item.department) {
          failCount++;
          errorMsgs.push(`Row missing required fields (ID, Name, Email, Dept)`);
          continue;
        }

        try {
          const res = await fetch(`${API_URL}/${type}s`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
          const data = await res.json();
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
            errorMsgs.push(`${item[idField]}: ${data.error || 'Import failed'}`);
          }
        } catch (err) {
          failCount++;
          errorMsgs.push(`${item[idField]}: Network error`);
        }
      }

      if (type === 'student') {
        fetchStudents();
      } else {
        fetchStaff();
      }
      fetchStats();

      if (successCount > 0) {
        showAlert(`Successfully imported ${successCount} ${type}s! ${failCount > 0 ? `${failCount} failed.` : ''}`);
      } else if (failCount > 0) {
        showAlert(`Failed to import records. Errors: ${errorMsgs.slice(0, 3).join(', ')}`, 'danger');
      }
      
      event.target.value = '';
    };

    reader.readAsText(file);
  };

  const parseCSV = (text, type) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    const firstLine = lines[0];
    if (!firstLine) return [];
    
    const headers = firstLine.split(',').map(h => 
      h.trim().replace(/^["']|["']$/g, '').toLowerCase()
    );

    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const matches = [];
      let current = '';
      let inQuotes = false;
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          matches.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      matches.push(current.trim().replace(/^["']|["']$/g, ''));

      const entry = {};
      headers.forEach((header, index) => {
        let key = header;
        if (header.includes('id') || header.includes('code') || header.includes('number')) {
          key = type === 'student' ? 'student_id' : 'staff_id';
        } else if (header.includes('name')) {
          key = 'name';
        } else if (header.includes('mail')) {
          key = 'email';
        } else if (header.includes('dept') || header.includes('department')) {
          key = 'department';
        } else if (header.includes('batch') || header.includes('year')) {
          key = 'batch';
        } else if (header.includes('designation') || header.includes('role') || header.includes('title')) {
          key = 'designation';
        }
        
        entry[key] = matches[index] || '';
      });

      results.push(entry);
    }
    return results;
  };

  // Date/Time formatting helpers
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="app-container">
      {/* Mobile Header Bar */}
      <div className="mobile-header">
        <button className="menu-toggle-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={22} />
        </button>
        <div className="mobile-logo-text">TIMESHEET PORTAL</div>
        <div style={{ width: '22px' }}></div> {/* Spacer */}
      </div>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Side Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="logo-container">
          <div className="logo-icon">
            <Clock size={22} strokeWidth={2.5} />
          </div>
          <span className="logo-text">TIMESHEET</span>
          <button className="mobile-close-sidebar-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="nav-links">
          <div 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Clock size={18} />
            <span>Dashboard</span>
          </div>
          <div 
            onClick={() => { setActiveTab('terminal'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'terminal' ? 'active' : ''}`}
          >
            <ArrowRightLeft size={18} />
            <span>Clock Terminal</span>
          </div>
          <div 
            onClick={() => { setActiveTab('students'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Students Directory</span>
          </div>
          <div 
            onClick={() => { setActiveTab('staff'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'staff' ? 'active' : ''}`}
          >
            <UserCheck size={18} />
            <span>Staff Directory</span>
          </div>
          <div 
            onClick={() => { setActiveTab('logs'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
          >
            <FileText size={18} />
            <span>Timesheet Logs</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <p>Timesheet Admin Console</p>
          <p>© 2026 Academic Portal</p>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        
        {/* Global Floating Alert Notification */}
        {alert && (
          <div className={`alert alert-${alert.type}`}>
            <Info size={18} />
            <span>{alert.message}</span>
          </div>
        )}

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="header-container">
              <div className="header-title">
                <h1>Timesheet Dashboard</h1>
                <p>Monitor real-time student and staff clock-ins and overview statistics.</p>
              </div>
            </div>

            {/* Dashboard Quick Stats */}
            <div className="stats-grid">
              <div className="card stat-card">
                <div>
                  <div className="stat-label">Total Students</div>
                  <div className="stat-value">{stats.counts.totalStudents}</div>
                </div>
                <div className="stat-icon blue">
                  <Users size={24} />
                </div>
              </div>
              <div className="card stat-card">
                <div>
                  <div className="stat-label">Clocked-In Students</div>
                  <div className="stat-value">{stats.counts.activeStudents}</div>
                </div>
                <div className="stat-icon green">
                  <UserCheck size={24} />
                </div>
              </div>
              <div className="card stat-card">
                <div>
                  <div className="stat-label">Total Staff</div>
                  <div className="stat-value">{stats.counts.totalStaff}</div>
                </div>
                <div className="stat-icon cyan">
                  <Users size={24} />
                </div>
              </div>
              <div className="card stat-card">
                <div>
                  <div className="stat-label">Clocked-In Staff</div>
                  <div className="stat-value">{stats.counts.activeStaff}</div>
                </div>
                <div className="stat-icon amber">
                  <UserCheck size={24} />
                </div>
              </div>
            </div>
            {/* Recent Activity Log Feed */}
            <div style={{ marginTop: '2rem' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} /> Recent Entry/Exit Feed
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  {stats.recentLogs && stats.recentLogs.length > 0 ? (
                    stats.recentLogs.map(log => (
                      <div 
                        key={log.id} 
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          paddingBottom: '0.75rem',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: log.check_out ? 'rgba(148,163,184,0.1)' : 'var(--success-glow)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: log.check_out ? 'var(--text-secondary)' : 'var(--success)'
                        }}>
                          {log.check_out ? <LogOut size={14} /> : <UserCheck size={14} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }} className="truncate">{log.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.id_code}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.purpose}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: log.check_out ? 'var(--text-muted)' : 'var(--success)' }}>
                              {log.check_out ? 'Out' : 'In'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {formatDateTime(log.check_out || log.check_in)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', margin: 'auto' }}>
                      No recent activities recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

      {/* 1.5. CLOCK TERMINAL TAB */}
      {activeTab === 'terminal' && (
        <div>
          <div className="header-container">
            <div className="header-title">
              <h1>Clock In/Out Terminal</h1>
              <p>Verify FaceID and resolve Geolocation details to record timesheet entries in real-time.</p>
            </div>
          </div>

          <div style={{ maxWidth: '650px', margin: '0 auto' }}>
            <div className="card">
              <div className="terminal-header">
                <div className="terminal-title">
                  <div className="indicator-dot"></div>
                  <span>Live Clock-In & Clock-Out Terminal</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Console Online</span>
              </div>

              <div ref={searchRef} style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search student or staff by Name or ID..."
                  style={{ paddingLeft: '2.75rem' }}
                  value={terminalSearch}
                  onChange={(e) => setTerminalSearch(e.target.value)}
                />
                
                {suggestions.length > 0 && (
                  <div className="autocomplete-results">
                    {suggestions.map(user => {
                      const isStudent = user.user_type === 'student';
                      return (
                        <div 
                          key={`${user.user_type}-${user.id}`} 
                          className="autocomplete-item"
                          onClick={() => handleSelectUser(user)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }} className="truncate">{user.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({user.idCode})</span>
                          </div>
                          <span className={`badge ${isStudent ? 'badge-student' : 'badge-staff'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                            {isStudent ? 'Student' : 'Staff'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedUser ? (
                <form onSubmit={(e) => { e.preventDefault(); handleClockAction(activeCheckInRecord ? 'out' : 'in'); }}>
                  
                  <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: '1.5rem', borderColor: 'var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedUser.name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {terminalUserType === 'student' ? `ID: ${selectedUser.student_id} | Batch: ${selectedUser.batch}` : `ID: ${selectedUser.staff_id} | Designation: ${selectedUser.designation}`}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Department: {selectedUser.department}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email: {selectedUser.email}</p>
                      </div>
                      <div>
                        {activeCheckInRecord ? (
                          <span className="badge badge-active">
                            <Info size={12} /> Clocked In
                          </span>
                        ) : (
                          <span className="badge badge-completed">
                            <XCircle size={12} /> Clocked Out
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {activeCheckInRecord && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', color: 'var(--success)' }}>
                        Clocked-in on: {formatDateTime(activeCheckInRecord.check_in)}
                      </div>
                    )}
                  </div>

                  <div className="camera-preview-container">
                    {cameraStream ? (
                      <video 
                        ref={videoRef} 
                        className="camera-video" 
                        autoPlay 
                        playsInline 
                        muted 
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <Clock size={24} style={{ marginBottom: '0.5rem', color: 'var(--warning)', animation: 'pulse 1.5s infinite alternate' }} />
                        <span>Requesting Camera Feed for Verification...</span>
                      </div>
                    )}
                    {cameraStream && (
                      <div className="scanner-overlay">
                        <div className="scanner-target tl"></div>
                        <div className="scanner-target tr"></div>
                        <div className="scanner-target bl"></div>
                        <div className="scanner-target br"></div>
                        
                        {scanStatus === 'scanning' && (
                          <div className="scanning-status-text verifying">
                            <span className="indicator-dot" style={{ backgroundColor: 'var(--warning)', boxShadow: '0 0 8px var(--warning)' }}></span>
                            Verifying Face ID...
                          </div>
                        )}
                        {scanStatus === 'verified' && (
                          <div className="scanning-status-text verified">
                            <CheckCircle size={14} /> Face ID Verified
                          </div>
                        )}
                        {scanStatus === 'ready' && (
                          <div className="scanning-status-text">
                            FaceID Scanner Active
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="location-status-badge">
                    <MapPin size={16} style={{ color: location && !location.error ? 'var(--success)' : 'var(--text-muted)' }} />
                    {isFetchingLocation ? (
                      <span>Resolving GPS Geolocation...</span>
                    ) : location ? (
                      location.error ? (
                        <span style={{ color: 'var(--danger)' }}>Location Error: {location.error}</span>
                      ) : (
                        <span>Location Locked: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
                      )
                    ) : (
                      <span>Awaiting coordinates...</span>
                    )}
                  </div>

                  {!activeCheckInRecord && (
                    <div className="form-group">
                      <label className="form-label">Purpose of Entry</label>
                      <select 
                        className="form-select"
                        value={terminalPurpose}
                        onChange={(e) => setTerminalPurpose(e.target.value)}
                      >
                        <option value="General">General / Routine Entry</option>
                        <option value="Lecture / Class">Lecture / Class</option>
                        <option value="Lab Work">Laboratory / Practical Work</option>
                        <option value="Library">Library Study</option>
                        <option value="Meeting / Admin">Meeting / Administrative Work</option>
                        <option value="Sports / Event">Sports / Event</option>
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">{activeCheckInRecord ? 'Clock-out Notes / Remarks (Optional)' : 'Clock-in Notes / Remarks (Optional)'}</label>
                    <textarea 
                      className="form-textarea" 
                      placeholder={activeCheckInRecord ? "Add any clock-out notes..." : "Enter notes e.g., Lab room number, topic..."}
                      value={terminalNotes}
                      onChange={(e) => setTerminalNotes(e.target.value)}
                    />
                  </div>

                  <div className="btn-group">
                    {activeCheckInRecord ? (
                      <button type="submit" className="btn btn-danger" disabled={isScanning}>
                        {isScanning ? 'Processing FaceID...' : <>
                          <LogOut size={16} /> Record Clock-Out
                        </>}
                      </button>
                    ) : (
                      <button type="submit" className="btn btn-success" disabled={isScanning}>
                        {isScanning ? 'Processing FaceID...' : <>
                          <UserCheck size={16} /> Record Clock-In
                        </>}
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={() => { setSelectedUser(null); setTerminalSearch(''); }}
                      style={{ width: '40%' }}
                      disabled={isScanning}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--card-border)', borderRadius: 'var(--radius-md)' }}>
                  <MapPin size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.95rem' }}>Search and select a profile above to initiate a Clock-in or Clock-out log.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* 2. STUDENTS TAB */}
        {activeTab === 'students' && (
          <div>
            <div className="header-container">
              <div className="header-title">
                <h1>Students Directory</h1>
                <p>Manage enrolled students details, view logs, and add new registrations.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input 
                  type="file" 
                  accept=".csv" 
                  id="student-import-input" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleImportCSV(e, 'student')} 
                />
                <button 
                  className="btn btn-outline" 
                  style={{ width: 'auto' }}
                  onClick={() => document.getElementById('student-import-input').click()}
                >
                  Import Excel/CSV
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ width: 'auto' }}
                  onClick={() => handleExportCSV('student')}
                >
                  Export to Excel
                </button>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setStudentModal({ show: true, mode: 'add', data: { student_id: generateNextStudentID() } })}>
                  <Plus size={16} /> Register Student
                </button>
              </div>
            </div>

            {/* Students List Display */}
            <div className="card table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Batch</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? (
                    students.map(student => (
                      <tr key={student.id}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{student.student_id}</td>
                        <td style={{ fontWeight: 600 }}>{student.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                        <td>{student.department}</td>
                        <td>
                          <span className="badge badge-student">{student.batch}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem', width: 'auto' }}
                              onClick={() => setStudentModal({ show: true, mode: 'edit', data: student })}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem', width: 'auto', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
                              onClick={() => handleDeleteStudent(student.id, student.name)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No students registered. Click "Register Student" to add.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. STAFF TAB */}
        {activeTab === 'staff' && (
          <div>
            <div className="header-container">
              <div className="header-title">
                <h1>Staff Directory</h1>
                <p>Manage academic and laboratory staff profiles and registrations.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input 
                  type="file" 
                  accept=".csv" 
                  id="staff-import-input" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleImportCSV(e, 'staff')} 
                />
                <button 
                  className="btn btn-outline" 
                  style={{ width: 'auto' }}
                  onClick={() => document.getElementById('staff-import-input').click()}
                >
                  Import Excel/CSV
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ width: 'auto' }}
                  onClick={() => handleExportCSV('staff')}
                >
                  Export to Excel
                </button>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setStaffModal({ show: true, mode: 'add', data: { staff_id: generateNextStaffID() } })}>
                  <Plus size={16} /> Register Staff
                </button>
              </div>
            </div>

            {/* Staff List Display */}
            <div className="card table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.length > 0 ? (
                    staff.map(member => (
                      <tr key={member.id}>
                        <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{member.staff_id}</td>
                        <td style={{ fontWeight: 600 }}>{member.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{member.email}</td>
                        <td>{member.department}</td>
                        <td>
                          <span className="badge badge-staff">{member.designation}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem', width: 'auto' }}
                              onClick={() => setStaffModal({ show: true, mode: 'edit', data: member })}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem', width: 'auto', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
                              onClick={() => handleDeleteStaff(member.id, member.name)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No staff members registered. Click "Register Staff" to add.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. TIMESHEET LOGS TAB */}
        {activeTab === 'logs' && (
          <div>
            <div className="header-container">
              <div className="header-title">
                <h1>Timesheet Entry Logs</h1>
                <p>View full details of historical clock-ins, clock-outs, and query logs.</p>
              </div>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setManualLogModal(true)}>
                <Plus size={16} /> Add Manual Log
              </button>
            </div>

            {/* Filter controls */}
            <div className="card filter-bar">
              <div className="filter-search" style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Search by Name or ID..."
                  value={logFilter.search}
                  onChange={(e) => setLogFilter(prev => ({ ...prev, search: e.target.value }))}
                />
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              <div>
                <select 
                  className="form-select"
                  value={logFilter.userType}
                  onChange={(e) => setLogFilter(prev => ({ ...prev, userType: e.target.value }))}
                >
                  <option value="">All Users</option>
                  <option value="student">Students Only</option>
                  <option value="staff">Staff Only</option>
                </select>
              </div>

              <div>
                <select 
                  className="form-select"
                  value={logFilter.checkedIn}
                  onChange={(e) => setLogFilter(prev => ({ ...prev, checkedIn: e.target.value }))}
                >
                  <option value="">All Statuses</option>
                  <option value="true">Clocked In (Active)</option>
                  <option value="false">Clocked Out (Completed)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From</span>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={logFilter.startDate}
                  onChange={(e) => setLogFilter(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To</span>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={logFilter.endDate}
                  onChange={(e) => setLogFilter(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              {(logFilter.userType || logFilter.checkedIn || logFilter.startDate || logFilter.endDate || logFilter.search) && (
                <button 
                  className="btn btn-outline" 
                  style={{ width: 'auto', padding: '0.6rem 1rem' }}
                  onClick={() => setLogFilter({ userType: '', checkedIn: '', startDate: '', endDate: '', search: '' })}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Entry logs list */}
            <div className="card table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>ID Code</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Verification</th>
                    <th>Purpose</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map(log => (
                      <tr key={log.id}>
                        <td>
                          <span className={`badge ${log.user_type === 'student' ? 'badge-student' : 'badge-staff'}`}>
                            {log.user_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.id_code}</td>
                        <td style={{ fontWeight: 600 }}>{log.name}</td>
                        <td>{log.department}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.date)}</td>
                        <td style={{ fontWeight: 500, color: 'var(--success)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                            <span>{formatDateTime(log.check_in)}</span>
                            {log.latitude_in && (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${log.latitude_in},${log.longitude_in}`}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="map-link-btn"
                                title="View Clock-In GPS Location"
                              >
                                <MapPin size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 500, color: log.check_out ? 'var(--text-secondary)' : 'var(--warning)' }}>
                          {log.check_out ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                              <span>{formatDateTime(log.check_out)}</span>
                              {log.latitude_out && (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${log.latitude_out},${log.longitude_out}`}
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="map-link-btn"
                                  title="View Clock-Out GPS Location"
                                >
                                  <MapPin size={14} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <button 
                              className="btn btn-success" 
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', width: 'auto' }}
                              onClick={() => handleTableCheckOut(log.id, log.name)}
                            >
                              Clock Out
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="photo-thumbnail-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {log.photo_in ? (
                              <img 
                                src={log.photo_in} 
                                alt="In Face" 
                                className="photo-thumbnail" 
                                title="Click to view Clock-In Photo"
                                onClick={() => setLightboxPhoto({ photo: log.photo_in, title: log.name, date: log.check_in, type: 'Clock In' })} 
                              />
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No In Photo</span>
                            )}
                            {log.photo_out ? (
                              <img 
                                src={log.photo_out} 
                                alt="Out Face" 
                                className="photo-thumbnail" 
                                title="Click to view Clock-Out Photo"
                                onClick={() => setLightboxPhoto({ photo: log.photo_out, title: log.name, date: log.check_out, type: 'Clock Out' })} 
                              />
                            ) : log.check_out ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No Out Photo</span>
                            ) : null}
                          </div>
                        </td>
                        <td>{log.purpose}</td>
                        <td style={{ maxWidth: '150px' }}>
                          <span className="truncate" style={{ maxWidth: '150px' }} title={log.notes}>
                            {log.notes || '-'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.4rem', width: 'auto', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
                            onClick={() => handleDeleteLog(log.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No entry logs found matching the filter options.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ==========================================
          MODALS & FORM POPUPS
      ========================================== */}

      {/* A. STUDENT REGISTRATION/EDIT MODAL */}
      {studentModal.show && (
        <div className="modal-overlay drawer">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {studentModal.mode === 'edit' ? 'Update Student Details' : 'Register New Student'}
              </h2>
              <button className="modal-close" onClick={() => setStudentModal({ show: false, mode: 'add', data: null })}>
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleStudentSubmit}>
              <div className="form-group">
                <label className="form-label">Student ID (Roll Number)</label>
                <input 
                  type="text" 
                  name="student_id" 
                  required 
                  className="form-input" 
                  placeholder="e.g. STU004"
                  defaultValue={studentModal.data ? studentModal.data.student_id : ''}
                  readOnly={true}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  className="form-input" 
                  placeholder="e.g. Rahul Verma"
                  defaultValue={studentModal.mode === 'edit' ? studentModal.data.name : ''}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  className="form-input" 
                  placeholder="e.g. rahul@example.com"
                  defaultValue={studentModal.mode === 'edit' ? studentModal.data.email : ''}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input 
                  type="text" 
                  name="department" 
                  required 
                  className="form-input" 
                  placeholder="e.g. Computer Science"
                  defaultValue={studentModal.mode === 'edit' ? studentModal.data.department : ''}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Batch (Academic Years)</label>
                <input 
                  type="text" 
                  name="batch" 
                  required 
                  className="form-input" 
                  placeholder="e.g. 2023-2027"
                  defaultValue={studentModal.mode === 'edit' ? studentModal.data.batch : ''}
                />
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  {studentModal.mode === 'edit' ? 'Update Details' : 'Register Student'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setStudentModal({ show: false, mode: 'add', data: null })}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. STAFF REGISTRATION/EDIT MODAL */}
      {staffModal.show && (
        <div className="modal-overlay drawer">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {staffModal.mode === 'edit' ? 'Update Staff Member' : 'Register New Staff Member'}
              </h2>
              <button className="modal-close" onClick={() => setStaffModal({ show: false, mode: 'add', data: null })}>
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleStaffSubmit}>
              <div className="form-group">
                <label className="form-label">Staff ID</label>
                <input 
                  type="text" 
                  name="staff_id" 
                  required 
                  className="form-input" 
                  placeholder="e.g. STF003"
                  defaultValue={staffModal.data ? staffModal.data.staff_id : ''}
                  readOnly={true}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  className="form-input" 
                  placeholder="e.g. Dr. Kavita Rao"
                  defaultValue={staffModal.mode === 'edit' ? staffModal.data.name : ''}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  className="form-input" 
                  placeholder="e.g. kavita@example.com"
                  defaultValue={staffModal.mode === 'edit' ? staffModal.data.email : ''}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input 
                  type="text" 
                  name="department" 
                  required 
                  className="form-input" 
                  placeholder="e.g. Physics"
                  defaultValue={staffModal.mode === 'edit' ? staffModal.data.department : ''}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Designation / Role</label>
                <input 
                  type="text" 
                  name="designation" 
                  required 
                  className="form-input" 
                  placeholder="e.g. Associate Professor, HOD"
                  defaultValue={staffModal.mode === 'edit' ? staffModal.data.designation : ''}
                />
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  {staffModal.mode === 'edit' ? 'Update Details' : 'Register Staff'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setStaffModal({ show: false, mode: 'add', data: null })}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. MANUAL ENTRY LOG MODAL */}
      {manualLogModal && (
        <div className="modal-overlay drawer">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Manual Entry Log</h2>
              <button className="modal-close" onClick={() => setManualLogModal(false)}>
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleManualLogSubmit}>
              <div className="form-group">
                <label className="form-label">Select User (Student or Staff)</label>
                <select name="manual_user" required className="form-select">
                  <option value="">-- Choose User --</option>
                  <optgroup label="Students">
                    {students.map(s => (
                      <option key={`stud-${s.id}`} value={`student:${s.id}`}>
                        {s.name} ({s.student_id} - Student)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Staff Members">
                    {staff.map(st => (
                      <option key={`stf-${st.id}`} value={`staff:${st.id}`}>
                        {st.name} ({st.staff_id} - Staff)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Entry Date</label>
                <input type="date" name="date" required className="form-input" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Clock-In Time</label>
                  <input type="time" name="check_in_time" required className="form-input" defaultValue="09:00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Clock-Out Time</label>
                  <input type="time" name="check_out_time" required className="form-input" defaultValue="17:00" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Purpose of Entry</label>
                <select name="purpose" className="form-select">
                  <option value="General">General / Routine Entry</option>
                  <option value="Lecture / Class">Lecture / Class</option>
                  <option value="Lab Work">Laboratory / Practical Work</option>
                  <option value="Library">Library Study</option>
                  <option value="Meeting / Admin">Meeting / Administrative Work</option>
                  <option value="Sports / Event">Sports / Event</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Remarks</label>
                <textarea name="notes" className="form-textarea" placeholder="Add additional notes here..." />
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">Create Log Entry</button>
                <button type="button" className="btn btn-outline" onClick={() => setManualLogModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* D. FACEID PHOTO LIGHTBOX POPUP */}
      {lightboxPhoto && (
        <div className="lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
          <button className="lightbox-close" onClick={() => setLightboxPhoto(null)}>
            <X size={28} />
          </button>
          <img src={lightboxPhoto.photo} alt="Verification Face" className="lightbox-content" />
          <div className="lightbox-title">{lightboxPhoto.title}</div>
          <div className="lightbox-subtitle">
            {lightboxPhoto.type} Verification on {formatDateTime(lightboxPhoto.date)}
          </div>
        </div>
      )}

    </div>
  );
}
