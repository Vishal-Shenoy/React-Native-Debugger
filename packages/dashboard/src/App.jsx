import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Search, Trash2, Pause, Play, Copy, Check, Download, ChevronRight, Globe, Clock, Server, Activity, Info, EyeOff, X, Plus, Ban } from 'lucide-react';

// --- Shared Components & Logic ---

const renderJSON = (str, filterStr = '') => {
  try {
    let json = typeof str === 'object' ? str : JSON.parse(str);
    const formatted = JSON.stringify(json, null, 2);
    
    if (!filterStr) return formatted;

    const parts = formatted.split(new RegExp(`(${filterStr})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === filterStr.toLowerCase() 
        ? <mark key={i} className="highlight">{part}</mark> 
        : part
    );
  } catch (e) {
    const parts = String(str).split(new RegExp(`(${filterStr})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === filterStr.toLowerCase() 
        ? <mark key={i} className="highlight">{part}</mark> 
        : part
    );
  }
};

// --- Inspector Component ---

const Inspector = ({ requests, exclusions, onExclude }) => {
  const { requestId } = useParams();
  const [activeTab, setActiveTab] = useState('Headers');
  const [inspectorFilter, setInspectorFilter] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedRequest = useMemo(() => 
    requests.find(r => r.id === requestId), 
    [requests, requestId]
  );

  const [showExcludeForm, setShowExcludeForm] = useState(false);
  const [excludePattern, setExcludePattern] = useState('');

  // Update default exclude pattern when selectedRequest changes
  useEffect(() => {
    if (selectedRequest) {
      let defaultPattern = selectedRequest.url;
      try {
        const parsed = new URL(selectedRequest.url);
        defaultPattern = parsed.pathname;
      } catch (e) {}
      setExcludePattern(defaultPattern);
      setShowExcludeForm(false);
    }
  }, [selectedRequest]);

  const handleConfirmExclude = () => {
    if (excludePattern.trim()) {
      onExclude(excludePattern.trim());
      setShowExcludeForm(false);
    }
  };

  const generateCurl = (req) => {
    let curl = `curl '${req.url}' \\\n  -X '${req.method}'`;
    if (req.headers) {
      Object.entries(req.headers).forEach(([key, value]) => {
        curl += ` \\\n  -H '${key}: ${value}'`;
      });
    }
    if (req.requestBody) {
      const body = typeof req.requestBody === 'string' ? req.requestBody : JSON.stringify(req.requestBody);
      curl += ` \\\n  --data-raw '${body.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!requestId) {
    return (
      <div className="empty-state">
        <Globe size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <p>Select a request to view details</p>
      </div>
    );
  }

  if (!selectedRequest) {
    return <div className="empty-state">Request not found</div>;
  }

  return (
    <>
      <div className="inspector-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <span className={`method ${selectedRequest.method}`}>{selectedRequest.method}</span>
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedRequest.url}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`copy-btn ${copied ? 'success' : ''}`}
              onClick={() => copyToClipboard(generateCurl(selectedRequest))}
              title="Copy as cURL"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy cURL'}</span>
            </button>
            <button 
              className="copy-btn"
              onClick={() => setShowExcludeForm(prev => !prev)}
              title="Exclude requests matching this URL pattern"
            >
              <Ban size={14} />
              <span>Exclude URL</span>
            </button>
          </div>
        </div>

        {showExcludeForm && (
          <div className="inspector-exclude-form" style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Exclude future requests containing:
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={excludePattern}
                onChange={(e) => setExcludePattern(e.target.value)}
                placeholder="Exclusion pattern..."
                style={{
                  flex: 1,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  outline: 'none',
                  fontSize: '13px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmExclude();
                }}
              />
              <button 
                onClick={handleConfirmExclude}
                className="filter-btn active"
                style={{ background: 'var(--error)', border: '1px solid var(--error)', color: 'white', fontWeight: 600 }}
              >
                Exclude
              </button>
              <button 
                onClick={() => setShowExcludeForm(false)}
                className="filter-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="tabs">
        {['Headers', 'Payload', 'Response'].map(tab => (
          <div 
            key={tab} 
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>
      <div className="inspector-content">
        {activeTab === 'Headers' && (
          <div>
            <div className="section-title">General</div>
            <div className="header-row">
              <div className="header-name">Request URL:</div>
              <div className="header-value">{selectedRequest.url}</div>
            </div>
            <div className="header-row">
              <div className="header-name">Request Method:</div>
              <div className="header-value">{selectedRequest.method}</div>
            </div>
            <div className="header-row">
              <div className="header-name">Status Code:</div>
              <div className="header-value">{selectedRequest.status || '...'}</div>
            </div>

            <div className="section-title">Request Headers</div>
            {selectedRequest.headers && Object.entries(selectedRequest.headers).map(([k, v]) => (
              <div className="header-row" key={k}>
                <div className="header-name">{k}:</div>
                <div className="header-value">{v}</div>
              </div>
            ))}

            <div className="section-title">Response Headers</div>
            {selectedRequest.responseHeaders && Object.entries(selectedRequest.responseHeaders).map(([k, v]) => (
              <div className="header-row" key={k}>
                <div className="header-name">{k}:</div>
                <div className="header-value">{v}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab !== 'Headers' && (
          <div className="inspector-toolbar">
            <div className="search-wrapper">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="search-input mini" 
                placeholder={`Search in ${activeTab.toLowerCase()}...`}
                value={inspectorFilter}
                onChange={(e) => setInspectorFilter(e.target.value)}
              />
            </div>
          </div>
        )}

        {activeTab === 'Payload' && (
          <div className="json-view">
            <pre>
              {selectedRequest.requestBody ? renderJSON(selectedRequest.requestBody, inspectorFilter) : 'No payload'}
            </pre>
          </div>
        )}

        {activeTab === 'Response' && (
          <div className="json-view">
            <pre>
              {selectedRequest.responseBody ? renderJSON(selectedRequest.responseBody, inspectorFilter) : (selectedRequest.status ? 'No response data' : 'Waiting for response...')}
            </pre>
          </div>
        )}
      </div>
    </>
  );
};

// --- Network View Component ---

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const NetworkView = ({ 
  requests, 
  setRequests, 
  isPaused, 
  setIsPaused,
  networkFilter,
  setNetworkFilter,
  methodFilter,
  setMethodFilter,
  exclusions,
  setExclusions,
  showExclusions,
  setShowExclusions
}) => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [newExclusion, setNewExclusion] = useState('');

  const filteredRequests = useMemo(() => {
    let result = requests;

    // Filter by exclusions first
    if (exclusions && exclusions.length > 0) {
      result = result.filter(r => 
        !exclusions.some(pattern => 
          r.url.toLowerCase().includes(pattern.toLowerCase())
        )
      );
    }

    if (methodFilter) result = result.filter(r => r.method?.toUpperCase() === methodFilter);
    if (networkFilter.trim()) {
      const lf = networkFilter.toLowerCase();
      result = result.filter(r =>
        r.url.toLowerCase().includes(lf) ||
        (r.method && r.method.toLowerCase().includes(lf))
      );
    }
    return result;
  }, [requests, networkFilter, methodFilter, exclusions]);

  const totalExcludedCount = useMemo(() => {
    if (!exclusions || exclusions.length === 0) return 0;
    return requests.filter(r => 
      exclusions.some(pattern => r.url.toLowerCase().includes(pattern.toLowerCase()))
    ).length;
  }, [requests, exclusions]);

  // Navigate away if currently inspected request gets excluded
  useEffect(() => {
    if (requestId && exclusions && exclusions.length > 0) {
      const selectedReq = requests.find(r => r.id === requestId);
      if (selectedReq) {
        const isExcluded = exclusions.some(pattern => 
          selectedReq.url.toLowerCase().includes(pattern.toLowerCase())
        );
        if (isExcluded) {
          navigate('/network');
        }
      }
    }
  }, [requestId, exclusions, requests, navigate]);

  const handleAddExclusion = (pattern) => {
    const cleanPattern = pattern.trim();
    if (cleanPattern && !exclusions.includes(cleanPattern)) {
      setExclusions(prev => [...prev, cleanPattern]);
    }
    setNewExclusion('');
  };

  const handleRemoveExclusion = (pattern) => {
    setExclusions(prev => prev.filter(p => p !== pattern));
  };

  const clearLogs = () => {
    setRequests([]);
    setMethodFilter(null);
    navigate('/network');
  };

  // Count per method for badges
  const methodCounts = useMemo(() => {
    const counts = {};
    requests.forEach(r => {
      const m = r.method?.toUpperCase();
      if (m) counts[m] = (counts[m] || 0) + 1;
    });
    return counts;
  }, [requests]);

  return (
    <>
      <div className="request-list">
        {/* ── URL search + pause/clear toolbar ── */}
        <div className="toolbar">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Filter by URL"
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
          />
          <button className="filter-btn" onClick={clearLogs} title="Clear logs">
            <Trash2 size={16} />
          </button>
          <button 
            className={`filter-btn ${isPaused ? 'active' : ''}`} 
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button 
            className={`filter-btn ${showExclusions ? 'active' : ''}`} 
            onClick={() => setShowExclusions(!showExclusions)}
            title="Manage Exclusions"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <EyeOff size={16} />
            {exclusions.length > 0 && <span className="exclusion-badge-count">{exclusions.length}</span>}
          </button>
        </div>

        {/* Exclusions Panel */}
        {showExclusions && (
          <div className="exclusions-panel">
            <div className="exclusions-header">
              <span>Excluded URL Patterns ({exclusions.length})</span>
              {exclusions.length > 0 && (
                <button className="text-btn" onClick={() => setExclusions([])}>Clear All</button>
              )}
            </div>
            <div className="exclusions-input-row">
              <input
                type="text"
                placeholder="Ignore URLs containing (e.g. heartbeat)..."
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddExclusion(newExclusion);
                  }
                }}
              />
              <button className="filter-btn" onClick={() => handleAddExclusion(newExclusion)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>
            {exclusions.length > 0 && (
              <div className="exclusions-list">
                {exclusions.map((pat, idx) => (
                  <span key={idx} className="exclusion-tag">
                    {pat}
                    <button onClick={() => handleRemoveExclusion(pat)} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Method filter pills ── */}
        <div className="adv-level-bar" style={{ flexShrink: 0 }}>
          <span className="adv-level-label">Method:</span>
          <button
            className={`adv-level-btn ${!methodFilter ? 'active' : ''}`}
            onClick={() => setMethodFilter(null)}
          >
            All
            {requests.length > 0 && (
              <span className="method-count">{requests.length}</span>
            )}
          </button>
          {HTTP_METHODS.map(m => (
            <button
              key={m}
              className={`adv-level-btn method-pill-${m} ${methodFilter === m ? 'active' : ''}`}
              onClick={() => setMethodFilter(prev => prev === m ? null : m)}
            >
              {m}
              {methodCounts[m] > 0 && (
                <span className="method-count">{methodCounts[m]}</span>
              )}
            </button>
          ))}
          {methodFilter && (
            <span className="adv-active-hint">{filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}</span>
          )}
          {totalExcludedCount > 0 && (
            <span className="adv-active-hint" style={{ color: 'var(--error)', fontStyle: 'normal', fontWeight: '500' }}>
              {totalExcludedCount} hidden by exclusions
            </span>
          )}
        </div>

        <div className="requests-container">
          {filteredRequests.map(r => (
            <div 
              key={r.id} 
              className={`request-item ${requestId === r.id ? 'selected' : ''}`}
              onClick={() => navigate(`/network/${r.id}`)}
            >
              <div className="request-item-header">
                <span className={`method ${r.method}`}>{r.method}</span>
                <span className={`status ${!r.status ? 'pending' : r.status < 400 ? 'success' : 'error'}`}>
                  {r.status || 'Pending'}
                </span>
              </div>
              <div className="url">{r.url.split('/').pop() || r.url}</div>
              <div className="timing">
                <span>{(() => { try { return new URL(r.url).hostname; } catch(e) { return r.url; } })()}</span>
                <span>{r.duration ? `${r.duration}ms` : ''}</span>
              </div>
            </div>
          ))}
          {filteredRequests.length === 0 && (
            <div className="empty-state">
              {methodFilter || networkFilter ? 'No requests match your filters' : 'No requests captured'}
            </div>
          )}
        </div>
      </div>

      <div className="inspector">
        <Inspector 
          requests={requests} 
          exclusions={exclusions} 
          onExclude={handleAddExclusion} 
        />
      </div>
    </>
  );
};

// --- Console View Component ---

const LEVEL_FILTERS = ['log', 'info', 'warn', 'error', 'debug'];

const highlightTokens = (text, tokens) => {
  if (!tokens.length) return text;
  const pattern = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = String(text).split(pattern);
  return parts.map((part, i) =>
    tokens.some(t => part.toLowerCase() === t.toLowerCase())
      ? <mark key={i} className="highlight">{part}</mark>
      : part
  );
};

const ConsoleView = ({ 
  logs, 
  setLogs,
  inputValue,
  setInputValue,
  filterTags,
  setFilterTags,
  matchMode,
  setMatchMode,
  levelFilter,
  setLevelFilter
}) => {
  const inputRef = useRef(null);

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase();
    if (tag && !filterTags.includes(tag)) {
      setFilterTags(prev => [...prev, tag]);
    }
    setInputValue('');
  };

  const removeTag = (tag) => setFilterTags(prev => prev.filter(t => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && filterTags.length) {
      setFilterTags(prev => prev.slice(0, -1));
    }
  };

  const matchesLog = (log) => {
    const haystack = [
      ...log.payload.map(p => String(p)),
      log.level,
      log.file || '',
    ].join(' ').toLowerCase();
    if (matchMode === 'OR') return filterTags.some(t => haystack.includes(t));
    return filterTags.every(t => haystack.includes(t));
  };

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (levelFilter) result = result.filter(l => l.level === levelFilter);
    if (filterTags.length) result = result.filter(matchesLog);
    // also apply live input as a preview filter
    if (inputValue.trim()) {
      const lv = inputValue.trim().toLowerCase();
      result = result.filter(log => {
        const h = [...log.payload.map(p => String(p)), log.level, log.file || ''].join(' ').toLowerCase();
        return h.includes(lv);
      });
    }
    return result;
  }, [logs, filterTags, matchMode, levelFilter, inputValue]);

  const clearAll = () => {
    setLogs([]);
    setFilterTags([]);
    setInputValue('');
    setLevelFilter(null);
  };

  return (
    <div className="console-view">
      {/* ── Advanced search bar ── */}
      <div className="adv-search-bar" onClick={() => inputRef.current?.focus()}>
        <Search size={13} className="adv-search-icon" />
        <div className="adv-tags-row">
          {filterTags.map(tag => (
            <span key={tag} className="adv-tag">
              {tag}
              <button className="adv-tag-remove" onClick={(e) => { e.stopPropagation(); removeTag(tag); }}>×</button>
            </span>
          ))}
          <input
            ref={inputRef}
            className="adv-tag-input"
            placeholder={filterTags.length ? 'Add key…' : 'Search — press Enter or , to add a filter tag'}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}

          />
        </div>
        {filterTags.length > 1 && (
          <button
            className={`adv-mode-btn ${matchMode === 'AND' ? 'and-active' : 'or-active'}`}
            onClick={(e) => { e.stopPropagation(); setMatchMode(m => m === 'OR' ? 'AND' : 'OR'); }}
            title="Toggle AND / OR matching"
          >
            {matchMode}
          </button>
        )}
        <button className="filter-btn" style={{ flexShrink: 0 }} onClick={clearAll} title="Clear logs">
          <Trash2 size={15} />
        </button>
      </div>

      {/* ── Level quick-filters ── */}
      <div className="adv-level-bar">
        <span className="adv-level-label">Level:</span>
        <button
          className={`adv-level-btn ${!levelFilter ? 'active' : ''}`}
          onClick={() => setLevelFilter(null)}
        >All</button>
        {LEVEL_FILTERS.map(lv => (
          <button
            key={lv}
            className={`adv-level-btn level-pill-${lv} ${levelFilter === lv ? 'active' : ''}`}
            onClick={() => setLevelFilter(prev => prev === lv ? null : lv)}
          >
            {lv.toUpperCase()}
          </button>
        ))}
        {filterTags.length > 0 && (
          <span className="adv-active-hint">
            {filterTags.length} tag{filterTags.length > 1 ? 's' : ''} · {matchMode} · {filteredLogs.length} result{filteredLogs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Log list ── */}
      <div className="console-logs">
        {filteredLogs.map(log => (
          <div key={log.id} className={`console-entry level-${log.level}`}>
            <span className="log-time">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="log-level">{log.level.toUpperCase()}</span>
            <span className="log-file">{log.file}</span>
            <div className="log-content">
              {log.payload.map((arg, i) => (
                <span key={i} className="log-arg">
                  {typeof arg === 'string' && arg.startsWith('{') ? (
                    <pre className="json-view-mini">{renderJSON(arg, filterTags.join('|'))}</pre>
                  ) : (
                    filterTags.length
                      ? highlightTokens(String(arg), filterTags)
                      : String(arg)
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div className="empty-state">
            {filterTags.length || levelFilter ? 'No logs match your filters' : 'No console logs captured'}
          </div>
        )}
      </div>
    </div>
  );
};

// --- WebSocket View Component ---

const WS_STATUS_FILTERS = ['open', 'open_with_msg', 'closed', 'error'];

const WS_MESSAGE_FILTERS = [
  { label: 'WS_CONNECT', type: 'connect', color: '#8b5cf6' },
  { label: 'WS_OPEN', type: 'open', color: '#10b981' },
  { label: 'WS_SEND', type: 'message_sent', color: '#3b82f6' },
  { label: 'WS_RECV', type: 'message_received', color: '#f59e0b' },
  { label: 'WS_CLOSE', type: 'close', color: '#6b7280' },
  { label: 'WS_ERROR', type: 'error', color: '#ef4444' },
];

const WebSocketView = ({ 
  wsConnections, 
  setWsConnections, 
  isPaused, 
  setIsPaused,
  filter,
  setFilter,
  statusFilter,
  setStatusFilter
}) => {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const [activeMsgFilters, setActiveMsgFilters] = useState(WS_MESSAGE_FILTERS.map(f => f.type));

  const filteredConnections = useMemo(() => {
    let result = wsConnections;
    if (statusFilter === 'open_with_msg') {
      result = result.filter(c => c.status === 'open' && c.messages && c.messages.length > 0);
    } else if (statusFilter) {
      result = result.filter(c => c.status === statusFilter);
    }
    
    if (filter.trim()) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(c => c.url && c.url.toLowerCase().includes(lowerFilter));
    }
    return result;
  }, [wsConnections, filter, statusFilter]);

  const activeConnection = connectionId ? wsConnections.find(c => c.id === connectionId) : null;

  const filteredMessages = useMemo(() => {
    if (!activeConnection || !activeConnection.messages) return [];
    return activeConnection.messages.filter(m => activeMsgFilters.includes(m.type));
  }, [activeConnection, activeMsgFilters]);

  // Count per status for badges
  const statusCounts = useMemo(() => {
    const counts = {};
    wsConnections.forEach(c => {
      const s = c.status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
      
      // Specifically count connections that are open AND have messages
      if (s === 'open' && c.messages && c.messages.length > 0) {
        counts['open_with_msg'] = (counts['open_with_msg'] || 0) + 1;
      }
    });
    return counts;
  }, [wsConnections]);

  const clearLogs = () => {
    setWsConnections([]);
    setStatusFilter(null);
    navigate('/websockets');
  };

  const toggleMsgFilter = (type) => {
    setActiveMsgFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <>
      <div className="request-list">
        <div className="toolbar">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Filter by URL"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className="filter-btn" onClick={clearLogs} title="Clear connections">
            <Trash2 size={16} />
          </button>
        </div>

        {/* ── Status filter pills ── */}
        <div className="adv-level-bar" style={{ flexShrink: 0 }}>
          <span className="adv-level-label">Status:</span>
          <button
            className={`adv-level-btn ${!statusFilter ? 'active' : ''}`}
            onClick={() => setStatusFilter(null)}
          >
            All
            {wsConnections.length > 0 && (
              <span className="method-count">{wsConnections.length}</span>
            )}
          </button>
          {WS_STATUS_FILTERS.map(s => (
            <button
              key={s}
              className={`adv-level-btn ws-status-pill-${s} ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(prev => prev === s ? null : s)}
            >
              {s === 'open_with_msg' ? 'Open with Messages' : s.charAt(0).toUpperCase() + s.slice(1)}
              {statusCounts[s] > 0 && (
                <span className="method-count">{statusCounts[s]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="requests-container">
          {filteredConnections.map(c => (
            <div 
              key={c.id} 
              className={`request-item ${connectionId === c.id ? 'selected' : ''}`}
              onClick={() => navigate(`/websockets/${c.id}`)}
            >
              <div className="request-item-header">
                <span className={`method GET`} style={{backgroundColor: '#8b5cf6'}}>WS</span>
                <span className={`status ${c.status === 'open' ? 'success' : c.status === 'closed' ? '' : 'error'}`}>
                  {c.status || 'unknown'}
                </span>
              </div>
              <div className="url">{c.url ? (c.url.split('/').pop() || c.url) : 'Unknown URL'}</div>
              <div className="timing">
                <span>{c.url ? (() => { try { return new URL(c.url).hostname; } catch(e){ return 'Invalid URL' } })() : 'Unknown'}</span>
                <span>{c.messages ? c.messages.length : 0} msgs</span>
              </div>
            </div>
          ))}
          {filteredConnections.length === 0 && (
            <div className="empty-state">No WebSocket connections captured</div>
          )}
        </div>
      </div>

      <div className="inspector" style={{display: 'flex', flexDirection: 'column'}}>
        {activeConnection ? (
          <>
            <div className="inspector-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{activeConnection.url}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {WS_MESSAGE_FILTERS.map(f => (
                  <button 
                    key={f.type}
                    onClick={() => toggleMsgFilter(f.type)}
                    className={`adv-level-btn ${activeMsgFilters.includes(f.type) ? 'active' : ''}`}
                    style={{ 
                      fontSize: '10px', 
                      padding: '2px 8px',
                      borderColor: activeMsgFilters.includes(f.type) ? f.color : 'transparent',
                      backgroundColor: activeMsgFilters.includes(f.type) ? `${f.color}22` : ''
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="console-logs" style={{flex: 1, overflowY: 'auto', padding: '16px'}}>
              {filteredMessages.map((m, i) => {
                const config = WS_MESSAGE_FILTERS.find(f => f.type === m.type) || { label: m.type, color: '#666' };
                return (
                  <div key={i} className={`console-entry`} style={{ borderLeftColor: config.color, marginBottom: '8px' }}>
                    <span className="log-time" style={{minWidth: '70px'}}>{new Date(m.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="log-level" style={{minWidth: '85px', color: config.color, fontSize: '10px', fontWeight: 600}}>{config.label}</span>
                    <div className="log-content">
                       {m.type === 'close' && (
                         <div style={{color: '#ef4444', fontWeight: 500}}>Closed (Code: {m.code}, Reason: {m.reason || 'None'})</div>
                       )}
                       {m.type === 'error' && (
                         <div style={{color: '#ef4444', fontWeight: 500}}>Error Event</div>
                       )}
                       {(m.type === 'message_received' || m.type === 'message_sent') && (
                         (() => {
                            const isObject = typeof m.data === 'object' && m.data !== null;
                            const isJsonString = typeof m.data === 'string' && (m.data.trim().startsWith('{') || m.data.trim().startsWith('['));
                            const isSocketIO = typeof m.data === 'string' && /^\d+\[/.test(m.data);

                            if (isObject || isJsonString || isSocketIO) {
                               let displayData = m.data;
                               if (isSocketIO) {
                                  try {
                                     const match = m.data.match(/^\d+(\[.*\])$/);
                                     if (match) displayData = JSON.parse(match[1]);
                                  } catch(e) {}
                               }
                               return <pre className="json-view-mini" style={{margin: 0}}>{renderJSON(displayData)}</pre>;
                            }
                            return <span className="log-arg" style={{wordBreak: 'break-all'}}>{m.data}</span>;
                         })()
                       )}
                       {m.type === 'open' && <div style={{color: '#10b981', fontWeight: 500}}>Connection Opened</div>}
                       {m.type === 'connect' && <div style={{color: '#8b5cf6', fontWeight: 500}}>Connection Initialized</div>}
                    </div>
                  </div>
                );
              })}
              {filteredMessages.length === 0 && (
                <div className="empty-state">No messages match your filters</div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Activity size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>Select a connection to view messages</p>
          </div>
        )}
      </div>
    </>
  );
};

// --- Info View Component ---

const InfoView = () => {
  return (
    <div className="inspector" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', overflowY: 'auto', padding: '32px', color: 'var(--text-primary)' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 600 }}>rn-network-debugger-console Setup Guide</h1>
      
      <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        Complete setup guide to integrate the React Native Network Debugger into your iOS and Android applications.
      </p>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>1. Installation</h2>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
          npm install --save-dev rn-network-debugger-console<br />
          # or<br />
          yarn add -D rn-network-debugger-console
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>2. Initialization</h2>
        <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Add the following code to your application's entry point (e.g., <code>App.js</code> or <code>index.js</code>):
        </p>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', color: '#c9d1d9' }}>
{`import { startDebugger } from 'rn-network-debugger-console';

startDebugger({
  port: 9000,
  host: 'localhost',          // IP of the machine running the dashboard
  captureFetch: true,
  captureXHR: true,
  captureConsole: true,
  captureWebSocket: true,
  maskedHeaders: ['Authorization', 'Cookie']
});`}
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>3. Android Setup</h2>
        <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          When running on an Android emulator, <code>localhost</code> will automatically resolve to <code>10.0.2.2</code> to connect to the host machine.
        </p>
        <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <strong>Physical Device via ADB:</strong> The easiest way to connect a physical device over USB is to use ADB port forwarding:
        </p>
        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
          adb reverse tcp:9000 tcp:9000
        </div>
        <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <strong>Physical Device via Wi-Fi:</strong> Ensure your phone and development machine are on the same Wi-Fi network. Set the <code>host</code> parameter in <code>startDebugger</code> to your machine's local network IP address (e.g., <code>192.168.1.5</code>).
        </p>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px', color: 'var(--accent)' }}>Cleartext Traffic</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '12px' }}>
          If you run into connection issues on Android 9+, you may need to allow cleartext traffic to your dev server (since WebSockets connect via <code>ws://</code> instead of <code>wss://</code>). In <code>android/app/src/main/AndroidManifest.xml</code>, ensure the application tag has:
        </p>
        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
          android:usesCleartextTraffic="true"
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>4. iOS Setup</h2>
        <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          When running on iOS simulators, <code>localhost</code> works out of the box.
        </p>
        <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <strong>Physical Device:</strong> Like Android, ensure your iPhone and Mac are on the same local network, and update the <code>host</code> parameter to your Mac's IP address.
        </p>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px', color: 'var(--accent)' }}>ATS (App Transport Security)</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '12px' }}>
          In <code>ios/YourProject/Info.plist</code>, ensure you allow arbitrary loads for local development so it can connect to the <code>ws://</code> server:
        </p>
        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', color: '#c9d1d9' }}>
{`<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>localhost</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <true/>
    </dict>
  </dict>
</dict>`}
        </div>
      </section>
      
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>5. Start the Server/Dashboard</h2>
        <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Run the debugger server via npx or add it to your <code>package.json</code> scripts:
        </p>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
          npx rn-network-debugger-console
        </div>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          This starts the server on port 9000 and the dashboard on port 3000. Open <code>http://localhost:3000</code> in your browser.
        </p>
      </section>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [wsConnections, setWsConnections] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  
  // Console state
  const [consoleInputValue, setConsoleInputValue] = useState('');
  const [consoleFilterTags, setConsoleFilterTags] = useState([]);
  const [consoleMatchMode, setConsoleMatchMode]   = useState('OR');
  const [consoleLevelFilter, setConsoleLevelFilter] = useState(null);

  // Network state
  const [networkFilter, setNetworkFilter] = useState('');
  const [networkMethodFilter, setNetworkMethodFilter] = useState(null);
  const [exclusions, setExclusions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('network_exclusions') || '[]');
    } catch {
      return [];
    }
  });
  const [showExclusions, setShowExclusions] = useState(false);

  useEffect(() => {
    localStorage.setItem('network_exclusions', JSON.stringify(exclusions));
  }, [exclusions]);

  // WebSocket state
  const [wsFilter, setWsFilter] = useState('');
  const [wsStatusFilter, setWsStatusFilter] = useState(null);
  const ws = useRef(null);
  // Use a ref so the onmessage handler always reads the latest value
  // without needing to re-run the effect (which would disconnect/reconnect).
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? 'localhost:9000' : window.location.host;
      const url = `${protocol}//${host}`;
      
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('Dashboard connected to server');
        ws.current.send(JSON.stringify({ type: 'IDENTIFY', role: 'dashboard' }));
      };

      ws.current.onmessage = (e) => {
        // Read from ref — never stale, no reconnect needed on pause toggle
        if (isPausedRef.current) return;

        const data = JSON.parse(e.data);

        if (data.type === 'console') {
          setLogs(prev => [data, ...prev].slice(0, 5000));
          return;
        }

        if (data.type === 'websocket') {
          setWsConnections(prev => {
            const index = prev.findIndex(c => c.id === data.id);
            // When a message_sent/received arrives before the connect event,
            // data.url may be undefined — fall back to empty string so the
            // connection entry is still created and messages are stored.
            let conn = index !== -1
              ? { ...prev[index] }
              : { id: data.id, url: data.url || '', messages: [], status: 'connecting' };
            
            if (data.event === 'connect' || data.event === 'open') {
               conn.status = data.event === 'open' ? 'open' : 'connecting';
               if (data.url) conn.url = data.url;
            } else if (data.event === 'close' || data.event === 'error') {
               conn.status = data.event === 'close' ? 'closed' : 'error';
            }

            // Always add to messages log for the detail view
            conn.messages = [...(conn.messages || []), {
              type: data.event,
              data: data.data,
              code: data.code,
              reason: data.reason,
              timestamp: data.timestamp
            }].slice(-1000); // Increased limit to 1000
            
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = conn;
              return updated;
            } else {
              return [conn, ...prev].slice(0, 100); // keep last 100 connections
            }
          });
          return;
        }

        setRequests(prev => {
          const index = prev.findIndex(r => r.id === data.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...data };
            return updated;
          } else if (data.type === 'request') {
            return [data, ...prev].slice(0, 2000);
          }
          return prev;
        });
      };

      ws.current.onclose = () => {
        setTimeout(connect, 2000);
      };
    };

    connect();
    return () => ws.current?.close();
  }, []); // Empty deps — connect once and stay connected

  return (
    <Router>
      <div className="app-container">
        {/* Primary Sidebar */}
        <div className="nav-sidebar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '100%' }}>
            <NavLink 
              to="/network" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title="Network"
            >
              <Globe size={20} />
              <span>Network</span>
            </NavLink>
            <NavLink 
              to="/console" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title="Console"
            >
              <Server size={20} />
              <span>Console</span>
            </NavLink>
            <NavLink 
              to="/websockets" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title="WebSockets"
            >
              <Activity size={20} />
              <span>WS</span>
            </NavLink>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <NavLink 
              to="/info" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title="Setup Guide"
            >
              <Info size={20} />
              <span>Info</span>
            </NavLink>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Navigate to="/network" replace />} />
          <Route path="/network" element={
            <NetworkView 
              requests={requests} 
              setRequests={setRequests} 
              isPaused={isPaused} 
              setIsPaused={setIsPaused} 
              networkFilter={networkFilter}
              setNetworkFilter={setNetworkFilter}
              methodFilter={networkMethodFilter}
              setMethodFilter={setNetworkMethodFilter}
              exclusions={exclusions}
              setExclusions={setExclusions}
              showExclusions={showExclusions}
              setShowExclusions={setShowExclusions}
            />
          } />
          <Route path="/network/:requestId" element={
            <NetworkView 
              requests={requests} 
              setRequests={setRequests} 
              isPaused={isPaused} 
              setIsPaused={setIsPaused} 
              networkFilter={networkFilter}
              setNetworkFilter={setNetworkFilter}
              methodFilter={networkMethodFilter}
              setMethodFilter={setNetworkMethodFilter}
              exclusions={exclusions}
              setExclusions={setExclusions}
              showExclusions={showExclusions}
              setShowExclusions={setShowExclusions}
            />
          } />
          <Route path="/console" element={
            <ConsoleView 
              logs={logs} 
              setLogs={setLogs} 
              inputValue={consoleInputValue}
              setInputValue={setConsoleInputValue}
              filterTags={consoleFilterTags}
              setFilterTags={setConsoleFilterTags}
              matchMode={consoleMatchMode}
              setMatchMode={setConsoleMatchMode}
              levelFilter={consoleLevelFilter}
              setLevelFilter={setConsoleLevelFilter}
            />
          } />
          <Route path="/websockets" element={
            <WebSocketView 
              wsConnections={wsConnections} 
              setWsConnections={setWsConnections} 
              isPaused={isPaused} 
              setIsPaused={setIsPaused} 
              filter={wsFilter}
              setFilter={setWsFilter}
              statusFilter={wsStatusFilter}
              setStatusFilter={setWsStatusFilter}
            />
          } />
          <Route path="/websockets/:connectionId" element={
            <WebSocketView 
              wsConnections={wsConnections} 
              setWsConnections={setWsConnections} 
              isPaused={isPaused} 
              setIsPaused={setIsPaused} 
              filter={wsFilter}
              setFilter={setWsFilter}
              statusFilter={wsStatusFilter}
              setStatusFilter={setWsStatusFilter}
            />
          } />
          <Route path="/info" element={<InfoView />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
