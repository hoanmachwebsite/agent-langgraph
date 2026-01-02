import { useState, useEffect, useMemo } from 'react';

interface InterruptInfo {
  toolName: string;
  args: Record<string, unknown>;
  description?: string;
  checkpointId?: string;
  runId?: string;
  allowedDecisions: Array<'approve' | 'reject' | 'edit'>;
}

export function useInterrupt(
  interrupt: { value?: unknown; id?: string } | null | undefined
) {
  const [editArgs, setEditArgs] = useState('');

  const interruptInfo = useMemo<InterruptInfo | null>(() => {
    if (!interrupt?.value) return null;

    try {
      const value = interrupt.value as Record<string, unknown>;
      
      // Parse interrupt data structure
      // The structure may vary, but typically contains tool name, args, etc.
      const toolName = (value.tool_name as string) || (value.name as string) || 'Unknown';
      const args = (value.args as Record<string, unknown>) || (value.arguments as Record<string, unknown>) || {};
      const description = (value.description as string) || (value.message as string);
      const checkpointId = (value.checkpoint_id as string) || (value.checkpointId as string);
      const runId = (value.run_id as string) || (value.runId as string);
      
      // Determine allowed decisions based on interrupt data
      const allowedDecisions: Array<'approve' | 'reject' | 'edit'> = [];
      if (value.allowed_decisions) {
        const decisions = value.allowed_decisions as string[];
        if (decisions.includes('approve')) allowedDecisions.push('approve');
        if (decisions.includes('reject')) allowedDecisions.push('reject');
        if (decisions.includes('edit')) allowedDecisions.push('edit');
      } else {
        // Default: allow all decisions
        allowedDecisions.push('approve', 'reject', 'edit');
      }

      return {
        toolName,
        args,
        description,
        checkpointId,
        runId,
        allowedDecisions,
      };
    } catch (error) {
      console.error('Error parsing interrupt:', error);
      return null;
    }
  }, [interrupt]);

  // Initialize editArgs with current args when interrupt changes
  useEffect(() => {
    if (interruptInfo?.args) {
      setEditArgs(JSON.stringify(interruptInfo.args, null, 2));
    } else {
      setEditArgs('');
    }
  }, [interruptInfo]);

  const clearInterrupt = () => {
    setEditArgs('');
  };

  return {
    interruptInfo,
    editArgs,
    setEditArgs,
    clearInterrupt,
  };
}

