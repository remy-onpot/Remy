-- ============================================
-- SECURITY ENHANCEMENT MIGRATION
-- Enhanced Device Fingerprinting & User-Agent Validation
-- ============================================
-- Run this migration to add enhanced security features to existing databases

-- 1. Add user_agent column to track browser identity
ALTER TABLE exam_sessions 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 2. Add security_flags column for detailed tracking
ALTER TABLE exam_sessions 
ADD COLUMN IF NOT EXISTS security_flags JSONB DEFAULT '[]'::jsonb;

-- 3. Update status enum to include 'terminated'
ALTER TABLE exam_sessions 
DROP CONSTRAINT IF EXISTS exam_sessions_status_check;

ALTER TABLE exam_sessions 
ADD CONSTRAINT exam_sessions_status_check 
CHECK (status IN ('in_progress', 'submitted', 'flagged', 'terminated'));

-- 4. Add metadata column to security_logs for detailed information
ALTER TABLE security_logs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 5. Create index for user_agent lookups (performance)
CREATE INDEX IF NOT EXISTS idx_sessions_user_agent ON exam_sessions(user_agent);

-- 6. Create index for security flags queries
CREATE INDEX IF NOT EXISTS idx_sessions_security_flags ON exam_sessions USING GIN(security_flags);

-- 7. Add index for session status + index_number (duplicate login detection)
CREATE INDEX IF NOT EXISTS idx_sessions_index_status ON exam_sessions(index_number, status, quiz_id);

-- 8. Function to log security events with metadata
CREATE OR REPLACE FUNCTION log_security_event(
  p_session_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO security_logs (session_id, event_type, metadata)
  VALUES (p_session_id, p_event_type, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to add security flag to session
CREATE OR REPLACE FUNCTION add_security_flag(
  p_session_id UUID,
  p_flag_type TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_flag JSONB;
BEGIN
  v_flag := jsonb_build_object(
    'type', p_flag_type,
    'details', p_details,
    'timestamp', NOW()
  );
  
  UPDATE exam_sessions
  SET security_flags = security_flags || v_flag
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger to auto-increment strikes on security violations
CREATE OR REPLACE FUNCTION increment_strikes_on_violation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type IN ('tab_switch', 'window_blur', 'copy_attempt', 'devtools_detected', 'user_agent_mismatch') THEN
    UPDATE exam_sessions
    SET strikes = strikes + 1
    WHERE id = NEW.session_id
    AND strikes < 5; -- Prevent overflow
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_strikes ON security_logs;
CREATE TRIGGER trigger_increment_strikes
  AFTER INSERT ON security_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_strikes_on_violation();

-- 11. Auto-flag session on excessive strikes
CREATE OR REPLACE FUNCTION auto_flag_on_strikes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.strikes >= 3 AND OLD.strikes < 3 THEN
    NEW.status := 'flagged';
    
    -- Log the auto-flag event
    INSERT INTO security_logs (session_id, event_type, metadata)
    VALUES (NEW.id, 'auto_flagged', jsonb_build_object('strikes', NEW.strikes, 'reason', 'excessive_violations'));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_flag ON exam_sessions;
CREATE TRIGGER trigger_auto_flag
  BEFORE UPDATE OF strikes ON exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_on_strikes();

-- 12. Create view for security monitoring dashboard
CREATE OR REPLACE VIEW session_security_summary AS
SELECT 
  es.id as session_id,
  es.quiz_id,
  es.index_number,
  es.status,
  es.strikes,
  es.started_at,
  es.last_heartbeat,
  es.device_fingerprint,
  es.user_agent,
  jsonb_array_length(es.security_flags) as flag_count,
  COUNT(sl.id) as total_violations,
  COUNT(CASE WHEN sl.event_type = 'user_agent_mismatch' THEN 1 END) as ua_violations,
  COUNT(CASE WHEN sl.event_type = 'tab_switch' THEN 1 END) as tab_switches,
  COUNT(CASE WHEN sl.event_type = 'window_blur' THEN 1 END) as focus_losses
FROM exam_sessions es
LEFT JOIN security_logs sl ON sl.session_id = es.id
GROUP BY es.id;

-- Grant access to the view
GRANT SELECT ON session_security_summary TO authenticated;
GRANT SELECT ON session_security_summary TO anon;

COMMENT ON COLUMN exam_sessions.user_agent IS 'Original User-Agent string from session start - used to detect browser switching';
COMMENT ON COLUMN exam_sessions.security_flags IS 'Array of security violations with timestamps and details';
COMMENT ON COLUMN security_logs.metadata IS 'Additional contextual data about the security event (e.g., previous vs current user agent)';
