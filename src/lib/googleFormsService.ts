import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth as formsAuth } from './firebase';

export { formsAuth };

// Configure Google Forms & Drive Provider
export const googleFormsProvider = new GoogleAuthProvider();
googleFormsProvider.addScope('https://www.googleapis.com/auth/forms.body');
googleFormsProvider.addScope('https://www.googleapis.com/auth/forms.body.readonly');
googleFormsProvider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');
googleFormsProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleFormsProvider.addScope('https://www.googleapis.com/auth/drive.readonly');

let isFormsSigningIn = false;
let cachedFormsAccessToken: string | null = null;

export interface DriveFormFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface GoogleFormItem {
  itemId: string;
  title: string;
  description?: string;
  questionItem?: {
    question: {
      questionId: string;
      required?: boolean;
      textQuestion?: {
        paragraph?: boolean;
      };
      choiceQuestion?: {
        type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
        options: Array<{ value: string }>;
      };
    };
  };
}

export interface GoogleFormDetail {
  formId: string;
  info: {
    title: string;
    documentTitle?: string;
    description?: string;
  };
  settings?: any;
  items?: GoogleFormItem[];
  responderUri?: string;
  revisionId?: string;
}

export interface GoogleFormAnswer {
  questionId: string;
  textAnswers?: {
    answers: Array<{ value: string }>;
  };
}

export interface GoogleFormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime?: string;
  respondentEmail?: string;
  answers?: Record<string, GoogleFormAnswer>;
}

/**
 * Initialize Auth listener for Google Forms
 */
export const initFormsAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(formsAuth, async (user: User | null) => {
    if (user) {
      if (cachedFormsAccessToken) {
        if (onSuccess) onSuccess(user, cachedFormsAccessToken);
      } else if (!isFormsSigningIn) {
        if (onFailure) onFailure();
      }
    } else {
      cachedFormsAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

/**
 * Sign in with Google to grant Forms & Drive permissions
 */
export const signInWithGoogleForms = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isFormsSigningIn = true;
    const result = await signInWithPopup(formsAuth, googleFormsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Forms access token.');
    }

    cachedFormsAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedFormsAccessToken };
  } catch (error: any) {
    console.error('Google Forms sign-in error:', error);
    throw error;
  } finally {
    isFormsSigningIn = false;
  }
};

/**
 * Get cached Forms Access Token
 */
export const getFormsAccessToken = (): string | null => {
  return cachedFormsAccessToken;
};

/**
 * Disconnect Google Forms session
 */
export const disconnectGoogleForms = async () => {
  cachedFormsAccessToken = null;
};

/**
 * Fetch List of Google Forms from Google Drive
 */
export const fetchDriveForms = async (token: string): Promise<DriveFormFile[]> => {
  try {
    const q = encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false");
    const fields = encodeURIComponent('files(id,name,createdTime,modifiedTime,webViewLink,iconLink)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=50&orderBy=modifiedTime%20desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to fetch Google Forms list: ${res.status}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Failed to list Google Forms:', err);
    throw err;
  }
};

/**
 * Get details of a specific Google Form
 */
export const fetchFormDetail = async (token: string, formId: string): Promise<GoogleFormDetail> => {
  try {
    const url = `https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to fetch Form details: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Error fetching Form detail:', err);
    throw err;
  }
};

/**
 * Fetch Responses for a specific Google Form
 */
export const fetchFormResponses = async (token: string, formId: string): Promise<GoogleFormResponse[]> => {
  try {
    const url = `https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to fetch Form responses: ${res.status}`);
    }

    const data = await res.json();
    return data.responses || [];
  } catch (err) {
    console.error('Error fetching Form responses:', err);
    throw err;
  }
};

/**
 * Create a new Google Form
 */
export const createNewForm = async (
  token: string,
  title: string,
  description?: string,
  questions?: Array<{
    title: string;
    type: 'SHORT_TEXT' | 'PARAGRAPH' | 'MULTIPLE_CHOICE' | 'CHECKBOXES';
    options?: string[];
    required?: boolean;
  }>
): Promise<GoogleFormDetail> => {
  try {
    // 1. Create base form
    const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        info: {
          title,
          documentTitle: title,
          description: description || 'Created via Just1Play Sports Hub'
        }
      })
    });

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Failed to create Google Form');
    }

    const newForm: GoogleFormDetail = await createRes.json();

    // 2. Add Questions via batchUpdate if provided
    if (questions && questions.length > 0) {
      const requests = questions.map((q, index) => {
        let questionObj: any = {
          required: q.required !== false
        };

        if (q.type === 'SHORT_TEXT') {
          questionObj.textQuestion = { paragraph: false };
        } else if (q.type === 'PARAGRAPH') {
          questionObj.textQuestion = { paragraph: true };
        } else if (q.type === 'MULTIPLE_CHOICE' || q.type === 'CHECKBOXES') {
          questionObj.choiceQuestion = {
            type: q.type === 'CHECKBOXES' ? 'CHECKBOX' : 'RADIO',
            options: (q.options || ['Option 1', 'Option 2']).map((opt) => ({ value: opt }))
          };
        }

        return {
          createItem: {
            item: {
              title: q.title,
              questionItem: {
                question: questionObj
              }
            },
            location: { index }
          }
        };
      });

      const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${newForm.formId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });

      if (!batchRes.ok) {
        console.warn('Questions batch update warning:', await batchRes.text());
      }
    }

    // Refetch full detail
    return await fetchFormDetail(token, newForm.formId);
  } catch (err) {
    console.error('Error creating Google Form:', err);
    throw err;
  }
};
