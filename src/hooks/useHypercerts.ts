import { useState } from 'react';
import { PasswordSession } from '@atproto/lex-password-session';
import { Client } from '@atproto/lex';
import { supabase } from '../lib/supabase';

// Manually define the lexicon ID since we aren't using the full build pipeline
const HYPERCERT_COLLECTION = 'org.hypercerts.claim.activity';

export type HypercertClaim = {
  title: string;
  description: string;
  shortDescription: string;
  createdAt: string;
  image?: {
    uri: string;
  };
};

export function useHypercerts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveHandle = async (handle: string) => {
    try {
      const resp = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`);
      const data = await resp.json();
      if (data.did) return data.did;
      throw new Error(data.message || 'Could not resolve handle');
    } catch (err: any) {
      console.error('Handle resolution failed:', err);
      setError(err.message);
      return null;
    }
  };

  const createHypercert = async (
    handle: string,
    appPassword: string,
    claim: HypercertClaim
  ) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate using the new PasswordSession API
      const session = await PasswordSession.login({
        service: 'https://bsky.social',
        identifier: handle,
        password:appPassword,
      });

      if (!session.did) throw new Error('Failed to get DID from session');

      // 2. Create a Client with the session
      const client = new Client(session);

      // 3. Create the record using the Client.create method
      // We use a generic approach since we don't have the generated lexicon types
      const result = await client.create(HYPERCERT_COLLECTION as any, {
        $type: HYPERCERT_COLLECTION,
        ...claim,
      });

      return {
        uri: result.uri,
        cid: result.cid,
        did: session.did,
      };
    } catch (err: any) {
      console.error('Hypercert creation failed:', err);
      setError(err.message || 'Failed to create Hypercert');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const linkAtProtoIdentity = async (userId: string, did: string) => {
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ atproto_did: did })
      .eq('id', userId);

    if (dbError) {
      setError(dbError.message);
      return false;
    }
    return true;
  };

  return {
    createHypercert,
    resolveHandle,
    linkAtProtoIdentity,
    loading,
    error,
  };
}
