---
order: 4
---

# Access Control Interceptor Sample

This sample demonstrates fine-grained, per-user access control for a hosted feature service. The interceptor identifies the requesting user and returns only the features assigned to that user. The sample uses a U.S. states dataset, with usernames hard-coded for demonstration. For example, the user james12 can access only the “California” and “Oregon” features when querying the Hosted/States feature service.

## Configure the hosted feature service for this sample

Follow the steps below to create a hosted feature service using Portal for ArcGIS.

1. Download the sample dataset from here.
2. In Portal for ArcGIS, go to Content > My Content and click the New item button.
3. Drag or upload States.gdb (zipped) to the New item window. 
4. Under File type, select File geodatabase. Under How would you like to add this file?, select "Add States.gdb.zip and create a hosted feature   layer". Click the Next button. 
5. Ensure the Title for the hosted feature service is “States” and click the Save button. 
6. Navigate to Content > My Content and ensure that the States hosted feature layer item is available.
You can also publish the hosted feature service from ArcGIS Pro.


## Set up testing environment

### Create new users

