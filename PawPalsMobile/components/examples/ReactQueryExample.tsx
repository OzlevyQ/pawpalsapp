import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useUserProfile, useUserDogs, useActiveVisit, useCheckinMutation, useInvalidateQueries } from '../../hooks/useQueries';

/**
 * Example component demonstrating React Query usage
 * This shows how to migrate from direct API calls to React Query hooks
 */
export const ReactQueryExample: React.FC = () => {
  // Using React Query hooks instead of direct API calls
  const { 
    data: userProfile, 
    isLoading: isLoadingProfile, 
    error: profileError 
  } = useUserProfile();
  
  const { 
    data: userDogs, 
    isLoading: isLoadingDogs, 
    error: dogsError 
  } = useUserDogs();
  
  const { 
    data: activeVisit, 
    isLoading: isLoadingVisit 
  } = useActiveVisit();
  
  // Mutation hooks for actions
  const checkinMutation = useCheckinMutation();
  const { invalidateActiveVisit, invalidateUserDogs } = useInvalidateQueries();
  
  // Example of using mutation
  const handleCheckin = (gardenId: string, dogIds: string[]) => {
    checkinMutation.mutate(
      { gardenId, dogIds },
      {
        onSuccess: (response) => {
          console.log('Check-in successful:', response.data);
          // React Query automatically invalidates related queries
        },
        onError: (error) => {
          console.error('Check-in failed:', error);
        }
      }
    );
  };
  
  // Manual cache invalidation example
  const handleRefresh = () => {
    invalidateActiveVisit();
    invalidateUserDogs();
  };
  
  if (isLoadingProfile || isLoadingDogs || isLoadingVisit) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading data with React Query...</Text>
      </View>
    );
  }
  
  if (profileError || dogsError) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: 'red' }}>
          Error: {profileError?.message || dogsError?.message}
        </Text>
      </View>
    );
  }
  
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        React Query Example
      </Text>
      
      {/* User Profile Data */}
      <View style={{ marginBottom: 15 }}>
        <Text style={{ fontWeight: 'bold' }}>User Profile:</Text>
        <Text>Name: {userProfile?.firstName} {userProfile?.lastName}</Text>
        <Text>Points: {userProfile?.points}</Text>
        <Text>Level: {userProfile?.level}</Text>
      </View>
      
      {/* User Dogs Data */}
      <View style={{ marginBottom: 15 }}>
        <Text style={{ fontWeight: 'bold' }}>Dogs ({userDogs?.length || 0}):</Text>
        {userDogs?.map((dog) => (
          <Text key={dog._id}>• {dog.name} ({dog.breed})</Text>
        ))}
      </View>
      
      {/* Active Visit Status */}
      <View style={{ marginBottom: 15 }}>
        <Text style={{ fontWeight: 'bold' }}>Active Visit:</Text>
        <Text>
          {activeVisit ? `Checked in at garden` : 'No active visit'}
        </Text>
      </View>
      
      {/* Mutation Example */}
      <TouchableOpacity
        style={{
          backgroundColor: checkinMutation.isPending ? '#ccc' : '#007AFF',
          padding: 10,
          borderRadius: 5,
          marginBottom: 10,
        }}
        disabled={checkinMutation.isPending}
        onPress={() => {
          // Example usage - replace with actual gardenId and dogIds
          if (userDogs && userDogs.length > 0) {
            handleCheckin('example-garden-id', [userDogs[0]._id]);
          }
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {checkinMutation.isPending ? 'Checking in...' : 'Test Check-in'}
        </Text>
      </TouchableOpacity>
      
      {/* Manual Refresh */}
      <TouchableOpacity
        style={{
          backgroundColor: '#28a745',
          padding: 10,
          borderRadius: 5,
        }}
        onPress={handleRefresh}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Refresh Data
        </Text>
      </TouchableOpacity>
      
      {/* Cache Benefits Info */}
      <View style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>React Query Benefits:</Text>
        <Text>• Data is automatically cached for 5-10 minutes</Text>
        <Text>• Background refetching when app comes to foreground</Text>
        <Text>• Optimistic updates for better UX</Text>
        <Text>• Automatic retry on network errors</Text>
        <Text>• Smart invalidation after mutations</Text>
      </View>
    </View>
  );
};

export default ReactQueryExample;