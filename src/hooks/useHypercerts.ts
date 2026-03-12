import { useState } from 'react';
import { BskyAgent } from '@atproto/api';
import { supabase } from '../lib/supabase';

// Manually define the lexicon ID
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
      const agent = new BskyAgent({ service: 'https://bsky.social' });
      const { data } = await agent.resolveHandle({ handle });
      return data.did;
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
      // 1. Initialize Agent and Login
      const agent = new BskyAgent({ service: 'https://bsky.social' });
      await agent.login({
        identifier: handle,
        password: appPassword,
      });

      if (!agent.session?.did) throw new Error('Failed to get DID from session');

      // 2. Create the record using the repo.createRecord method
      const result = await agent.com.atproto.repo.createRecord({
        repo: agent.session.did,
        collection: HYPERCERT_COLLECTION,
        record: {
          $type: HYPERCERT_COLLECTION,
          ...claim,
        },
      });

      return {
        uri: result.data.uri,
        cid: result.data.cid,
        did: agent.session.did,
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
