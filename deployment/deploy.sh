#!/bin/sh
ENV=$1
PROJECT_NAME=$2
PACKAGE_VERSION=$3
REGION=$4
ARN_NUMBER=$5

echo "deploying image version ${PROJECT_NAME}:${ENV}-${PACKAGE_VERSION}"

kubectl config use-context aws-$1

#export package version
export PACKAGE_VERSION=$PACKAGE_VERSION
#export ENV
export ENV=$ENV
#export AWS REGION
export REGION=$REGION
#export ARN_NUMBER
export ARN_NUMBER=$ARN_NUMBER
#export project name
export PROJECT_NAME=$PROJECT_NAME


kubectl create secret generic $PROJECT_NAME-env \
    --namespace=$ENV \
    --save-config=true \
    --from-file=./.env \
    --dry-run=client -o yaml \
    | kubectl apply -f -

envsubst < ./deployment/deploy.yaml | kubectl apply --namespace=$ENV -f -

#remove unused repositories tag for freeing up space registry aws
echo "trying to remove unused repositories"
tag_to_skip=$ENV-$PACKAGE_VERSION
env_regex="^${ENV}"
tags=$(aws ecr list-images  --repository-name $PROJECT_NAME)
array_of_tags=$(aws ecr list-images --repository-name ${PROJECT_NAME} | awk -F '"' -e '$2 ~ /imageTag(.*)/ {print $4}')
inc=0
for tag in ${array_of_tags}
do
    if [ ${tag} = ${tag_to_skip} ]
         then
        echo "skipping tag ${tag}"
         continue
    elif [ ${tag} != ${tag_to_skip} ] && echo "${tag}" | grep -Eq "${env_regex}"
      then
         echo "deleting tag ${tag}"
         aws ecr batch-delete-image --repository-name ${PROJECT_NAME} --image-ids imageTag=${tag}
      continue
    fi

   # echo "not deleting tag ${tag}"
done
