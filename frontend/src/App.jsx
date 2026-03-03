import { useState, useEffect, useCallback } from 'react'
import { api, getToken, setToken } from './api'
import { Auth } from './Auth'
import { Toast } from './Toast'
import './App.css'

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'students', label: 'Students & data' },
  { id: 'month', label: 'Month & holidays' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'export', label: 'Export' },
]

function App() {
  const [token, setTokenState] = useState(() => getToken())
  const [tab, setTab] = useState('setup')
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [classData, setClassData] = useState(null)
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [cells, setCells] = useState([])
  const [monthConfigs, setMonthConfigs] = useState([])
  const [holidays, setHolidays] = useState([])
  const [attendance, setAttendance] = useState([])
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1)
  const [exportYear, setExportYear] = useState(new Date().getFullYear())
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1)
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear())
  const [newClassName, setNewClassName] = useState('')
  const [newColHeading, setNewColHeading] = useState('')
  const [newHolidayDay, setNewHolidayDay] = useState('')
  const [newHolidayReason, setNewHolidayReason] = useState('')
  const [newMonthConfig, setNewMonthConfig] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), num_days: 31 })
  const [bulkPasteColumnId, setBulkPasteColumnId] = useState(null)
  const [bulkPasteText, setBulkPasteText] = useState('')
  const [selectedRowIds, setSelectedRowIds] = useState([])

  const handleLogout = useCallback(() => {
    setToken(null)
    setTokenState(null)
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const loadClasses = useCallback(async () => {
    try {
      const data = await api.classes.list()
      setClasses(data || [])
      if (data?.length && !selectedClassId) setSelectedClassId(data[0].id)
    } catch (e) {
      if (e.message === 'Unauthorized') handleLogout()
      else showToast('Failed to load classes: ' + e.message, 'error')
    }
  }, [selectedClassId, showToast, handleLogout])

  useEffect(() => { if (token) loadClasses() }, [token, loadClasses])

  const loadClassData = useCallback(async () => {
    if (!selectedClassId) return
    try {
      const [c, cols, r, mc, h] = await Promise.all([
        api.classes.get(selectedClassId),
        api.columns(selectedClassId).list(),
        api.rows(selectedClassId).list(),
        api.monthConfigs(selectedClassId).list(),
        api.holidays(selectedClassId).list(),
      ])
      setClassData({
        ...c,
        school_name: c.school_name ?? '',
        class_label: c.class_label ?? '',
        class_incharge: c.class_incharge ?? '',
      })
      setColumns(cols || [])
      setRows(r || [])
      setMonthConfigs(mc || [])
      setHolidays(h || [])
      const cellsData = await api.cells(selectedClassId).list()
      setCells(cellsData || [])
    } catch (e) {
      if (e.message === 'Unauthorized') handleLogout()
      else showToast('Failed to load: ' + e.message, 'error')
    }
  }, [selectedClassId, showToast, handleLogout])

  useEffect(() => { if (token && selectedClassId) loadClassData() }, [token, selectedClassId, loadClassData])

  const loadAttendance = useCallback(async () => {
    if (!selectedClassId || !attendanceMonth || !attendanceYear) return
    try {
      const data = await api.attendance(selectedClassId).list(attendanceMonth, attendanceYear)
      setAttendance(data || [])
    } catch {
      setAttendance([])
    }
  }, [selectedClassId, attendanceMonth, attendanceYear])

  useEffect(() => { if (token && selectedClassId) loadAttendance() }, [token, selectedClassId, loadAttendance])

  const getMaxDaysInMonth = useCallback((month, year) => {
    const cfg = monthConfigs.find(m => m.month === month && m.year === year)
    if (cfg) return Math.min(31, Math.max(28, cfg.num_days))
    const d = new Date(year, month, 0)
    return d.getDate()
  }, [monthConfigs])

  if (!token) {
    return (
      <Auth onLogin={() => setTokenState(getToken())} />
    )
  }

  const handleCreateClass = async (e) => {
    e?.preventDefault()
    const name = newClassName.trim()
    if (!name) return
    try {
      await api.classes.create({ name, class_label: name, school_name: '', class_incharge: '' })
      setNewClassName('')
      showToast('Class created')
      loadClasses()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleDeleteClass = async () => {
    if (!selectedClassId) return
    const cur = classes.find(c => c.id === selectedClassId)
    const name = cur ? (cur.class_label || cur.name) : 'this class'
    if (!window.confirm(`Delete "${name}"? All its data (columns, rows, attendance, etc.) will be removed.`)) return
    try {
      await api.classes.delete(selectedClassId)
      setSelectedClassId(null)
      loadClasses()
      showToast('Class deleted')
    } catch (e) {
      if (e.message === 'Unauthorized') handleLogout()
      else showToast(e.message || 'Failed to delete class', 'error')
    }
  }

  const handleSaveHeading = async (e) => {
    e?.preventDefault()
    if (!selectedClassId || !classData) return
    const school = (classData.school_name ?? '').trim()
    const label = (classData.class_label ?? '').trim()
    const incharge = (classData.class_incharge ?? '').trim()
    if (!school || !label || !incharge) {
      showToast('Please fill School name, Class name and Class incharge', 'error')
      return
    }
    try {
      await api.classes.update(selectedClassId, {
        school_name: school,
        class_label: label,
        class_incharge: incharge,
      })
      setClassData(prev => ({ ...(prev || {}), school_name: school, class_label: label, class_incharge: incharge }))
      showToast('Heading saved')
      setTab('students')
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleAddColumn = async (e) => {
    e?.preventDefault()
    if (!selectedClassId || !newColHeading.trim()) return
    try {
      await api.columns(selectedClassId).create({
        heading: newColHeading.trim(),
        order: columns.length,
      })
      setNewColHeading('')
      showToast('Column added')
      loadClassData()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleDeleteColumn = async (columnId) => {
    if (!selectedClassId) return
    if (!window.confirm('Remove this column? Cell values in this column will be deleted.')) return
    try {
      await api.columns(selectedClassId).delete(columnId)
      showToast('Column removed')
      loadClassData()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleAddRow = async () => {
    if (!selectedClassId) return
    try {
      await api.rows(selectedClassId).create({ row_order: rows.length })
      showToast('Row added')
      loadClassData()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleDeleteRow = async (rowId) => {
    if (!selectedClassId) return
    if (!window.confirm('Remove this row? All cell and attendance data for this row will be deleted.')) return
    try {
      await api.rows(selectedClassId).delete(rowId)
      showToast('Row removed')
      loadClassData()
      loadAttendance()
    } catch (e) { showToast(e.message, 'error') }
  }

  const toggleRowSelection = (rowId) => {
    setSelectedRowIds(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId])
  }

  const toggleSelectAllRows = () => {
    if (!rows.length) return
    const allSelected = rows.every(r => selectedRowIds.includes(r.id))
    setSelectedRowIds(allSelected ? [] : rows.map(r => r.id))
  }

  const handleDeleteSelectedRows = async () => {
    if (!selectedClassId || selectedRowIds.length === 0) return
    const count = selectedRowIds.length
    if (!window.confirm(`Delete ${count} selected row(s)? All their data will be removed.`)) return
    try {
      for (const rowId of selectedRowIds) {
        await api.rows(selectedClassId).delete(rowId)
      }
      setSelectedRowIds([])
      loadClassData()
      loadAttendance()
      showToast(`${count} row(s) deleted`)
    } catch (e) { showToast(e.message, 'error') }
  }

  const getCellValue = (rowId, columnId) => {
    const c = cells.find(x => x.row === rowId && x.column === columnId)
    return c?.value ?? ''
  }

  const handleCellChange = async (rowId, columnId, value) => {
    if (!selectedClassId) return
    setCells(prev => {
      const rest = prev.filter(x => !(x.row === rowId && x.column === columnId))
      return [...rest, { row: rowId, column: columnId, value }]
    })
    try {
      await api.cells(selectedClassId).set(rowId, columnId, value)
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleBulkPasteColumn = async () => {
    if (!selectedClassId) return
    if (!bulkPasteColumnId) {
      showToast('Select a column first', 'error')
      window.alert('Please select a column first from the dropdown above.')
      return
    }
    const lines = bulkPasteText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (lines.length === 0) {
      showToast('Paste at least one line of text', 'error')
      window.alert('Please paste at least one line of text in the box below.')
      return
    }
    const N = lines.length
    try {
      if (rows.length < N) {
        const toCreate = N - rows.length
        for (let i = 0; i < toCreate; i++) {
          await api.rows(selectedClassId).create({ row_order: rows.length + i })
        }
      }
      const rowsList = await api.rows(selectedClassId).list()
      const cellsToSet = rowsList.slice(0, N).map((row, i) => ({
        row_id: row.id,
        column_id: bulkPasteColumnId,
        value: lines[i] || '',
      }))
      await api.cells(selectedClassId).bulk(cellsToSet)
      setBulkPasteText('')
      loadClassData()
      const created = Math.max(0, N - rows.length)
      showToast(created > 0
        ? `Created ${created} row(s) and filled ${N} value(s) in column.`
        : `Filled ${N} row(s) in column.`)
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleAddMonthConfig = async (e) => {
    e?.preventDefault()
    if (!selectedClassId) return
    const { month, year, num_days } = newMonthConfig
    if (!month || !year || num_days < 28 || num_days > 31) {
      showToast('Enter valid month (1–12), year, and days (28–31)', 'error')
      return
    }
    try {
      await api.monthConfigs(selectedClassId).create({ month, year, num_days })
      showToast('Month config added')
      loadClassData()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleDeleteMonthConfig = async (id) => {
    if (!selectedClassId) return
    try {
      await api.monthConfigs(selectedClassId).delete(id)
      showToast('Month config removed')
      loadClassData()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleAddHoliday = async (e) => {
    e?.preventDefault()
    if (!selectedClassId || !newHolidayReason.trim()) return
    const day = parseInt(newHolidayDay, 10)
    if (day < 1 || day > 31) {
      showToast('Day must be 1–31', 'error')
      return
    }
    try {
      await api.holidays(selectedClassId).create({
        month: attendanceMonth,
        year: attendanceYear,
        day,
        reason: newHolidayReason.trim(),
      })
      setNewHolidayDay('')
      setNewHolidayReason('')
      showToast('Holiday added')
      loadClassData()
      loadAttendance()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleDeleteHoliday = async (id) => {
    if (!selectedClassId) return
    try {
      await api.holidays(selectedClassId).delete(id)
      showToast('Holiday removed')
      loadClassData()
      loadAttendance()
    } catch (e) { showToast(e.message, 'error') }
  }

  const getAbsentDaysForRow = (rowId) =>
    attendance.filter(a => a.row === rowId).map(a => a.day)

  const handleSetAbsent = async (rowId, days) => {
    if (!selectedClassId) return
    try {
      await api.attendance(selectedClassId).bulk({
        row_id: rowId,
        month: attendanceMonth,
        year: attendanceYear,
        absent_days: days,
      })
      showToast('Attendance saved')
      loadAttendance()
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleExport = async () => {
    if (!selectedClassId) return
    try {
      const blob = await api.exportBlob(selectedClassId, exportMonth, exportYear)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${exportYear}_${exportMonth}.xlsx`
      a.setAttribute('rel', 'noopener noreferrer')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 200)
      showToast('Download started')
      setTab('setup')
    } catch (e) {
      if (e.message === 'Unauthorized') handleLogout()
      else showToast(e.message || 'Export failed', 'error')
    }
  }

  const currentClass = classes.find(c => c.id === selectedClassId)
  const currentClassName = currentClass ? (currentClass.class_label || currentClass.name) : ''

  const header = (
    <header className="header">
      <div className="header__brand">Attendance</div>
      <div className="header__right">
        {classes.length === 0 ? null : classes.length > 1 ? (
          <>
            <span className="header__hint">Switch class:</span>
            <select
              className="header__select"
              value={selectedClassId || ''}
              onChange={e => setSelectedClassId(Number(e.target.value))}
              title="Select which class you are managing"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.class_label || c.name}</option>
              ))}
            </select>
          </>
        ) : (
          <span className="header__current">Class: {currentClassName || '—'}</span>
        )}
        <button type="button" className="header__logout" onClick={handleLogout} title="Sign out">
          Logout
        </button>
      </div>
    </header>
  )

  const nav = (
    <nav className="nav">
      {TABS.map(t => (
        <button
          key={t.id}
          type="button"
          className={`nav__tab ${tab === t.id ? 'nav__tab--active' : ''}`}
          onClick={() => setTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )

  return (
    <div className="layout">
      {header}
      {nav}
      <div className="guide">
        <span className="guide__title">Do in this order:</span>
        <span className="guide__steps">1. Setup → 2. Students & data → 3. Month & holidays → 4. Attendance → 5. Export</span>
      </div>
      <main className="main">
        {tab === 'setup' && (
          <section className="page">
            {classes.length === 0 ? (
              <div className="card card--narrow">
                <h2 className="card__title">Create your first class</h2>
                <p className="card__desc">Enter a class name to get started (e.g. 2nd, 3rd).</p>
                <form onSubmit={handleCreateClass} className="form">
                  <div className="field">
                    <label className="field__label">Class name</label>
                    <input
                      type="text"
                      className="field__input"
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      placeholder="e.g. 2nd"
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="btn btn--primary btn--touch btn--block">Create class</button>
                </form>
              </div>
            ) : (
              <>
                <div className="card">
                  <h2 className="card__title">School & class heading</h2>
              <p className="card__desc">This appears at the top of the exported Excel sheet.</p>
              <form onSubmit={handleSaveHeading} className="form">
                <div className="field">
                  <label className="field__label">School name <span className="field__required">*</span></label>
                  <input
                    type="text"
                    className="field__input"
                    value={classData?.school_name ?? ''}
                    onChange={e => setClassData(d => ({ ...(d || {}), school_name: e.target.value }))}
                    placeholder="e.g. ASIAN PUBLIC SCHOOL"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field__label">Class name <span className="field__required">*</span></label>
                  <input
                    type="text"
                    className="field__input"
                    value={classData?.class_label ?? ''}
                    onChange={e => setClassData(d => ({ ...(d || {}), class_label: e.target.value }))}
                    placeholder="e.g. 2nd"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field__label">Class incharge <span className="field__required">*</span></label>
                  <input
                    type="text"
                    className="field__input"
                    value={classData?.class_incharge ?? ''}
                    onChange={e => setClassData(d => ({ ...(d || {}), class_incharge: e.target.value }))}
                    placeholder="e.g. POOJA GULATI"
                    required
                  />
                </div>
                <button type="submit" className="btn btn--primary btn--touch">Save heading</button>
              </form>
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button type="button" className="btn btn--danger btn--touch" onClick={handleDeleteClass} title="Remove this class and all its data">
                  Delete this class
                </button>
              </div>
            </div>
            <div className="card card--muted">
              <h3 className="card__subtitle">Add another class</h3>
              <p className="card__desc">Only needed if you manage more than one class (e.g. 2nd and 3rd).</p>
              <form onSubmit={handleCreateClass} className="form form--inline">
                <div className="field field--flex">
                  <label className="field__label">Class name</label>
                  <input
                    type="text"
                    className="field__input"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    placeholder="e.g. 3rd"
                  />
                </div>
                <button type="submit" className="btn btn--secondary btn--touch">Add class</button>
              </form>
            </div>
              </>
            )}
          </section>
        )}

        {tab === 'students' && (
          <section className="page">
            <div className="card">
              <h2 className="card__title">Columns</h2>
              <p className="card__desc">Add column headings (e.g. SL.no, Name, ADMN, Father's name).</p>
              <form onSubmit={handleAddColumn} className="form form--inline">
                <div className="field field--flex">
                  <label className="field__label">New column</label>
                  <input
                    type="text"
                    className="field__input"
                    value={newColHeading}
                    onChange={e => setNewColHeading(e.target.value)}
                    placeholder="Column heading"
                  />
                </div>
                <button type="submit" className="btn btn--primary btn--touch">Add column</button>
              </form>
              {columns.length > 0 && (
                <ul className="tag-list">
                  {columns.map(col => (
                    <li key={col.id} className="tag">
                      <span>{col.heading}</span>
                      <button type="button" className="tag__remove" onClick={() => handleDeleteColumn(col.id)} title="Remove column" aria-label={`Remove ${col.heading}`}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card">
              <h2 className="card__title">Rows & cell values</h2>
              <p className="card__desc">Each row is one student. Fill values for each column.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <button type="button" className="btn btn--primary btn--touch" onClick={handleAddRow}>Add row</button>
                {selectedRowIds.length > 0 && (
                  <button type="button" className="btn btn--danger btn--touch" onClick={handleDeleteSelectedRows}>
                    Delete selected ({selectedRowIds.length})
                  </button>
                )}
              </div>
              {rows.length > 0 && columns.length > 0 && (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="table__check">
                          <input type="checkbox" checked={rows.length > 0 && rows.every(r => selectedRowIds.includes(r.id))} onChange={toggleSelectAllRows} title="Select all" aria-label="Select all rows" />
                        </th>
                        <th>#</th>
                        {columns.map(col => <th key={col.id}>{col.heading}</th>)}
                        <th className="table__action">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={row.id} className={selectedRowIds.includes(row.id) ? 'table__row--selected' : ''}>
                          <td className="table__check">
                            <input type="checkbox" checked={selectedRowIds.includes(row.id)} onChange={() => toggleRowSelection(row.id)} aria-label={`Select row ${idx + 1}`} />
                          </td>
                          <td className="table__num">{idx + 1}</td>
                          {columns.map(col => (
                            <td key={col.id}>
                              <input
                                type="text"
                                className="field__input field__input--cell"
                                value={getCellValue(row.id, col.id)}
                                onChange={e => handleCellChange(row.id, col.id, e.target.value)}
                                placeholder="–"
                              />
                            </td>
                          ))}
                          <td className="table__action">
                            <button type="button" className="btn btn--danger btn--touch" style={{ padding: '0.35rem 0.65rem', minHeight: '36px' }} onClick={() => handleDeleteRow(row.id)} title="Remove this row">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {columns.length > 0 && (
              <div className="card card--muted">
                <h3 className="card__subtitle">Bulk paste into column</h3>
                <p className="card__desc">Paste one value per line (e.g. 30–40 names from Excel or a list). We will create rows if needed and fill the selected column: Line 1 → Row 1, Line 2 → Row 2, and so on.</p>
                <div className="form form--inline" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="field field--flex">
                    <label className="field__label">Column</label>
                    <select
                      className="field__input"
                      value={bulkPasteColumnId ?? ''}
                      onChange={e => setBulkPasteColumnId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Select column</option>
                      {columns.map(col => (
                        <option key={col.id} value={col.id}>{col.heading}</option>
                      ))}
                    </select>
                  </div>
                  {bulkPasteText.trim() && !bulkPasteColumnId && (
                    <span className="bulk-paste-warning">Please select a column first.</span>
                  )}
                  <button type="button" className="btn btn--primary btn--touch" onClick={handleBulkPasteColumn} disabled={!bulkPasteText.trim()}>
                    Fill column
                  </button>
                </div>
                <textarea
                  className="field__input"
                  rows={6}
                  placeholder={'Paste here: one value per line\ne.g.\nRahul\nPriya\nAmit\n...'}
                  value={bulkPasteText}
                  onChange={e => setBulkPasteText(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', minHeight: '120px' }}
                />
              </div>
            )}
            <div className="card card--muted" style={{ marginTop: '1rem' }}>
              <p className="card__desc" style={{ marginBottom: '0.75rem' }}>When you’re done adding columns, rows and filling data, continue to the next step.</p>
              <button type="button" className="btn btn--primary btn--touch btn--large" onClick={() => setTab('month')}>
                Continue to Month & holidays →
              </button>
            </div>
          </section>
        )}

        {tab === 'month' && (
          <section className="page">
            <div className="card">
              <h2 className="card__title">Month config</h2>
              <p className="card__desc">Set number of days for a month (e.g. 30 for April).</p>
              <form onSubmit={handleAddMonthConfig} className="form form--grid">
                <div className="field">
                  <label className="field__label">Month</label>
                  <select
                    className="field__input"
                    value={newMonthConfig.month}
                    onChange={e => setNewMonthConfig(m => ({ ...m, month: Number(e.target.value) }))}
                  >
                    {MONTHS.map((m, i) => i && <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label">Year</label>
                  <input
                    type="number"
                    className="field__input"
                    min="2020"
                    max="2030"
                    value={newMonthConfig.year}
                    onChange={e => setNewMonthConfig(m => ({ ...m, year: Number(e.target.value) }))}
                  />
                </div>
                <div className="field">
                  <label className="field__label">Days in month</label>
                  <input
                    type="number"
                    className="field__input"
                    min="28"
                    max="31"
                    value={newMonthConfig.num_days}
                    onChange={e => setNewMonthConfig(m => ({ ...m, num_days: Number(e.target.value) }))}
                  />
                </div>
                <div className="field field--submit">
                  <button type="submit" className="btn btn--primary btn--touch">Add month config</button>
                </div>
              </form>
              {monthConfigs.length > 0 && (
                <ul className="list list--with-actions">
                  {monthConfigs.map(m => (
                    <li key={m.id} className="list__item">
                      <span>{MONTHS[m.month]} {m.year} — {m.num_days} days</span>
                      <button type="button" className="btn btn--danger btn--touch" style={{ padding: '0.25rem 0.5rem', minHeight: '32px', fontSize: '0.8125rem' }} onClick={() => handleDeleteMonthConfig(m.id)} title="Remove">Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card">
              <h2 className="card__title">Holidays</h2>
              <p className="card__desc">Mark dates as holiday (e.g. Sunday). Same month/year used in Attendance.</p>
              <div className="form form--inline" style={{ marginBottom: '0.75rem' }}>
                <div className="field field--flex">
                  <label className="field__label">Month</label>
                  <select
                    className="field__input field__input--sm"
                    value={attendanceMonth}
                    onChange={e => setAttendanceMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m, i) => i && <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="field field--flex">
                  <label className="field__label">Year</label>
                  <input
                    type="number"
                    className="field__input field__input--sm"
                    min="2020"
                    max="2030"
                    value={attendanceYear}
                    onChange={e => setAttendanceYear(Number(e.target.value))}
                  />
                </div>
              </div>
              <form onSubmit={handleAddHoliday} className="form form--inline">
                <div className="field field--flex">
                  <label className="field__label">Day (1–31)</label>
                  <input
                    type="number"
                    className="field__input field__input--sm"
                    min="1"
                    max="31"
                    value={newHolidayDay}
                    onChange={e => setNewHolidayDay(e.target.value)}
                    placeholder="Day"
                  />
                </div>
                <div className="field field--flex">
                  <label className="field__label">Reason</label>
                  <input
                    type="text"
                    className="field__input"
                    value={newHolidayReason}
                    onChange={e => setNewHolidayReason(e.target.value)}
                    placeholder="e.g. Sunday"
                  />
                </div>
                <button type="submit" className="btn btn--primary btn--touch">Add holiday</button>
              </form>
              {holidays.filter(h => h.month === attendanceMonth && h.year === attendanceYear).length > 0 && (
                <ul className="list list--with-actions">
                  {holidays.filter(h => h.month === attendanceMonth && h.year === attendanceYear).map(h => (
                    <li key={h.id} className="list__item">
                      <span>{h.day} — {h.reason}</span>
                      <button type="button" className="btn btn--danger btn--touch" style={{ padding: '0.25rem 0.5rem', minHeight: '32px', fontSize: '0.8125rem' }} onClick={() => handleDeleteHoliday(h.id)} title="Remove">Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {tab === 'attendance' && (
          <section className="page">
            <div className="card">
              <h2 className="card__title">Mark absent dates</h2>
              <p className="card__desc">Enter only the dates when the student was absent (e.g. 5, 12, 19). Other days are marked Present.</p>
              <div className="form form--inline" style={{ marginBottom: '1rem' }}>
                <div className="field field--flex">
                  <label className="field__label">Month</label>
                  <select
                    className="field__input field__input--sm"
                    value={attendanceMonth}
                    onChange={e => setAttendanceMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m, i) => i && <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="field field--flex">
                  <label className="field__label">Year</label>
                  <input
                    type="number"
                    className="field__input field__input--sm"
                    min="2020"
                    max="2030"
                    value={attendanceYear}
                    onChange={e => setAttendanceYear(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="attendance-grid">
                {rows.map((row, idx) => {
                  const absent = getAbsentDaysForRow(row.id)
                  const nameCol = columns[0]
                  const rowLabel = nameCol ? (getCellValue(row.id, nameCol.id) || `Row ${idx + 1}`).trim() || `Row ${idx + 1}` : `Row ${idx + 1}`
                  return (
                    <div key={row.id} className="attendance-row">
                      <label className="attendance-row__label" title={nameCol ? `${nameCol.heading}: ${rowLabel}` : undefined}>{rowLabel}</label>
                      <input
                        key={`att-${row.id}-${attendanceMonth}-${attendanceYear}-${absent.join(',')}`}
                        type="text"
                        className="field__input"
                        placeholder="Absent days: 5, 12, 19"
                        defaultValue={absent.join(', ')}
                        onBlur={e => {
                          const str = e.target.value.replace(/\s/g, '')
                          const maxDays = getMaxDaysInMonth(attendanceMonth, attendanceYear)
                          const parsed = str ? str.split(',').map(d => parseInt(d, 10)).filter(d => !isNaN(d)) : []
                          const valid = parsed.filter(d => d >= 1 && d <= maxDays)
                          const invalid = parsed.filter(d => d < 1 || d > maxDays)
                          if (invalid.length > 0) {
                            showToast(`Invalid day(s) (e.g. ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '…' : ''}) removed. This month has ${maxDays} days only.`, 'error')
                          }
                          const days = [...new Set(valid)].sort((a, b) => a - b)
                          if (JSON.stringify(days) !== JSON.stringify([...absent].sort((a, b) => a - b))) {
                            handleSetAbsent(row.id, days)
                          }
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {tab === 'export' && (
          <section className="page">
            <div className="card card--narrow">
              <h2 className="card__title">Export to Excel</h2>
              <p className="card__desc">Download the attendance sheet for the selected month and year.</p>
              <div className="form form--grid">
                <div className="field">
                  <label className="field__label">Month</label>
                  <select
                    className="field__input"
                    value={exportMonth}
                    onChange={e => setExportMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m, i) => i && <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label">Year</label>
                  <input
                    type="number"
                    className="field__input"
                    min="2020"
                    max="2030"
                    value={exportYear}
                    onChange={e => setExportYear(Number(e.target.value))}
                  />
                </div>
                <div className="field field--submit">
                  <button type="button" className="btn btn--primary btn--large btn--touch export-download-btn" onClick={handleExport}>
                    Download Excel
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  )
}

export default App
