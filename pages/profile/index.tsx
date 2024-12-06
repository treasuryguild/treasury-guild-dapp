'use client';

import type { NextPage } from "next";
import ProtectedRoute from '../../components/ProtectedRoute';

const Profile: NextPage = () => {

  return (
    <ProtectedRoute>
      <div>
        Profile page
      </div>
    </ProtectedRoute>
  );
};

export default Profile;